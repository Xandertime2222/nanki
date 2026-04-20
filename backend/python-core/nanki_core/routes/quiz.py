from fastapi import APIRouter, HTTPException
from typing import List, Optional
import json
import re
import uuid
import logging
from datetime import datetime, timezone

from ..models import (
    Quiz, QuizQuestion, QuizResult, QuizStorage, QuizSettings,
    QuizGenerationRequest, QuizSubmissionRequest,
    QuizCoverageData, QuizCoverageResponse,
    QuizQuestionType,
    NoteDocument, NoteMetadata, Card,
)
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..ai import AIService
from ..prompts import DEFAULT_QUIZ_GENERATION_PROMPT
from ..coverage_apcg import (
    apcg_coverage,
    CoverageConfig,
    CoverageMode,
    generate_coverage_html as apcg_generate_html,
)

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

logger = logging.getLogger("nanki.quiz")

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)
ai_service = AIService(settings_manager, None)

QUIZ_STORAGE_FILE = "quizzes.json"


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def get_quiz_storage_path():
    return store.workspace_path / QUIZ_STORAGE_FILE


def load_quiz_storage() -> QuizStorage:
    path = get_quiz_storage_path()
    if not path.exists():
        return QuizStorage()
    try:
        return QuizStorage.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except Exception as exc:
        logger.warning(f"Failed to load quiz storage, returning empty: {exc}")
        return QuizStorage()


def save_quiz_storage(storage: QuizStorage) -> None:
    path = get_quiz_storage_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(storage.model_dump_json(indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@router.get("/settings")
async def get_quiz_settings() -> QuizSettings:
    return load_quiz_storage().quiz_settings


@router.put("/settings")
async def update_quiz_settings(settings: QuizSettings) -> QuizSettings:
    storage = load_quiz_storage()
    storage.quiz_settings = settings
    save_quiz_storage(storage)
    return settings


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

PRESET_COUNTS = {
    "few": None,  # AI decides, prompted for fewer questions
    "ai_decides": None,
    "many": None,  # AI decides, prompted for more questions
}

PRESET_INSTRUCTIONS = {
    "few": "Generate a short quiz with fewer questions. Focus on the most important points.",
    "ai_decides": "",
    "many": "Generate a comprehensive quiz with as many questions as needed to cover the entire note text thoroughly.",
}

DIFFICULTY_INSTRUCTIONS = {
    "easy": (
        "DIFFICULTY: EASY. Focus on basic recall, direct quotes, and simple "
        "definitions that are explicitly stated. A well-prepared user should "
        "answer 80%+ correctly."
    ),
    "normal": (
        "DIFFICULTY: NORMAL. Test genuine understanding: require the user to "
        "connect related facts, recognize correct order of steps, distinguish "
        "similar concepts, or interpret a statement. Aim for a 60–70% correct rate."
    ),
    "hard": (
        "DIFFICULTY: HARD. Require deep understanding, application of rules, "
        "recognizing subtle misconceptions in distractors, and integrating "
        "multiple parts of the text. Challenging even for a prepared user."
    ),
}


def _extract_json(content: str) -> dict:
    """Robustly pull a JSON object out of an AI response.

    Handles: raw JSON, ```json fenced blocks, ``` fenced blocks, and text
    surrounding a JSON object.
    """
    if not content:
        raise ValueError("Empty AI response")
    # Strip common markdown fences
    stripped = content.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, re.DOTALL | re.IGNORECASE)
    if fence_match:
        return json.loads(fence_match.group(1))
    # First { … last }
    first = stripped.find("{")
    last = stripped.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise ValueError("No JSON object found in AI response")
    return json.loads(stripped[first:last + 1])


def _validate_and_normalize_question(raw: dict, allowed_types: List[QuizQuestionType]) -> Optional[QuizQuestion]:
    """Validate a single question dict. Return None to drop malformed entries."""
    qtype = (raw.get("type") or "multiple_choice").strip().lower()
    if qtype not in ("multiple_choice", "answer_typing", "true_false"):
        return None
    if allowed_types and qtype not in allowed_types:
        return None

    question_text = (raw.get("question") or "").strip()
    correct = (raw.get("correct_answer") or "").strip()
    if not question_text or not correct:
        return None

    options = raw.get("options") or []
    if not isinstance(options, list):
        options = []
    options = [str(o).strip() for o in options if str(o).strip()]

    if qtype == "multiple_choice":
        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for o in options:
            if o.lower() not in seen:
                seen.add(o.lower())
                deduped.append(o)
        options = deduped
        if len(options) < 2:
            return None
        # Ensure correct answer is in options (case-insensitive match -> use canonical casing)
        match = next((o for o in options if o.lower() == correct.lower()), None)
        if match is None:
            # Drop rather than guess
            return None
        correct = match
    elif qtype == "true_false":
        options = ["True", "False"]
        norm = correct.strip().lower()
        if norm in ("true", "t", "yes", "wahr"):
            correct = "True"
        elif norm in ("false", "f", "no", "falsch"):
            correct = "False"
        else:
            return None
    else:  # answer_typing
        options = []

    # Accept "segment" (new) or "source_segment" (legacy) as the topic label
    segment_label = (raw.get("segment") or raw.get("source_segment") or "").strip()

    return QuizQuestion(
        id=uuid.uuid4().hex,
        type=qtype,
        question=question_text,
        options=options,
        correct_answer=correct,
        explanation=(raw.get("explanation") or "").strip(),
        source_excerpt=(raw.get("source_excerpt") or "").strip(),
        source_segment=segment_label,
    )


_PAGE_MARKER_RE = re.compile(
    r'^(seite|page|folie|slide|kapitel|chapter|teil|part|abschnitt|section)\s*\d*\s*$',
    re.IGNORECASE,
)


def _is_page_marker(label: str) -> bool:
    """Return True if a heading looks like a page/slide number rather than a topic."""
    stripped = label.strip()
    # Pure numeric heading ("1", "12") or matches known page-marker words
    return stripped.isdigit() or bool(_PAGE_MARKER_RE.match(stripped))


def _detect_segments(text: str) -> list[dict]:
    """Split note text into named information segments.

    Strategy:
    1. Use markdown headings as segment boundaries when ≥2 meaningful (non-page) headings found.
    2. Fall back to paragraph-based chunking (3–6 segments) otherwise.
       Page-marker headings ("Seite 1", "Folie 3", "Page 2", …) are treated as
       structural noise and never used as segment labels.

    Returns list of dicts with 'label' (str) and 'content' (str).
    """
    heading_pattern = re.compile(r'^#{1,3}\s+(.+)$', re.MULTILINE)
    heading_matches = list(heading_pattern.finditer(text))

    # Only use headings when the majority carry real topic names, not page numbers.
    meaningful = [m for m in heading_matches if not _is_page_marker(m.group(1).strip())]

    if len(meaningful) >= 2:
        segments = []
        positions = [(m.start(), m.group(1).strip()) for m in meaningful]
        positions.append((len(text), None))

        pre = text[:positions[0][0]].strip()
        if pre:
            segments.append({"label": "Introduction", "content": pre})

        for i in range(len(positions) - 1):
            start, label = positions[i]
            end = positions[i + 1][0]
            nl = text.find('\n', start)
            content_start = nl + 1 if nl != -1 and nl < end else start
            content = text[content_start:end].strip()
            if content:
                segments.append({"label": label, "content": content})

        if len(segments) >= 2:
            return segments

    # --- Paragraph-based fallback ---
    # Strip heading lines that are pure page markers so they don't pollute labels.
    cleaned_lines = []
    for line in text.splitlines():
        m = re.match(r'^#{1,3}\s+(.+)$', line)
        if m and _is_page_marker(m.group(1).strip()):
            continue
        cleaned_lines.append(line)
    cleaned = '\n'.join(cleaned_lines)

    paragraphs = [p.strip() for p in re.split(r'\n\s*\n+', cleaned) if p.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in cleaned.split('\n') if line.strip()]

    total = len(paragraphs)
    n_segs = min(max(2, total // 3), 6)
    chunk = max(1, total // n_segs)
    segments = []
    for i in range(0, total, chunk):
        content = '\n\n'.join(paragraphs[i:i + chunk])
        seg_num = i // chunk + 1
        # Derive label from first non-empty, non-heading line of the chunk
        first_line = paragraphs[i].split('\n')[0][:60].strip()
        # Strip any leading markdown heading marks for the label
        first_line = re.sub(r'^#{1,3}\s+', '', first_line)
        label = first_line if len(first_line) > 4 else f"Section {seg_num}"
        segments.append({"label": label, "content": content})

    return segments or [{"label": "Content", "content": text[:12000]}]


async def generate_quiz_questions(
    *,
    note_title: str,
    note_content: str,
    question_count: Optional[int],
    question_types: List[QuizQuestionType],
    difficulty: str,
    ai_prompt: str,
    preset_instruction: str = "",
) -> List[QuizQuestion]:
    settings = settings_manager.load()
    if not settings.ai.enabled:
        raise RuntimeError("AI is not enabled in settings")

    if question_count:
        target_line = f"Generate exactly {question_count} questions."
    else:
        target_line = "Choose a reasonable number of questions for the length and density of the text (between 5 and 15)."
    types_str = ", ".join(question_types) if question_types else "multiple_choice, answer_typing, true_false"
    diff_line = DIFFICULTY_INSTRUCTIONS.get(difficulty, DIFFICULTY_INSTRUCTIONS["normal"])

    # Truncate to avoid context-window overflow (~12 000 chars ≈ 3 000 tokens)
    content_block = note_content[:12000]

    user_prompt = (
        f"NOTE TITLE: {note_title}\n\n"
        f"{target_line}\n"
        f"Allowed question types: {types_str}.\n"
        f"{diff_line}\n"
        f"{preset_instruction}\n\n"
        "TASK: First identify every distinct information unit (concept, mechanism, "
        "definition, process, fact) in the note text below and assign each a short "
        "semantic label (2–6 descriptive words — NO structural labels like 'Page 1' "
        "or 'Paragraph 2'). Then generate questions distributed across ALL identified "
        "units. Set each question's \"segment\" field to the label you chose.\n"
        "Mix question types. Write in the language of the note text.\n\n"
        "--- NOTE TEXT ---\n"
        f"{content_block}\n"
        "--- END NOTE TEXT ---"
    )

    messages = [
        {"role": "system", "content": ai_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        content, _model, _provider = await ai_service._chat_completion(
            settings, task="quiz", messages=messages, model=None, temperature=0.3
        )
    except Exception as exc:
        raise RuntimeError(f"AI call failed: {exc}") from exc

    try:
        data = _extract_json(content)
    except Exception as exc:
        logger.error(f"Could not parse AI quiz JSON. Raw response head: {content[:400]!r}")
        raise RuntimeError(f"Could not parse AI response as JSON: {exc}") from exc

    raw_questions = data.get("questions") or []
    if not isinstance(raw_questions, list):
        raise RuntimeError("AI response JSON did not contain a 'questions' list")

    questions: List[QuizQuestion] = []
    for raw in raw_questions:
        if not isinstance(raw, dict):
            continue
        q = _validate_and_normalize_question(raw, question_types)
        if q is not None:
            questions.append(q)

    if not questions:
        raise RuntimeError(
            "AI returned no usable questions. Try a longer note, different "
            "question types, or lowering the difficulty."
        )
    # Trim overshoot
    if question_count and len(questions) > question_count:
        questions = questions[:question_count]

    # Stable-sort by segment so questions from the same topic are grouped
    segment_order: list[str] = []
    seen_segs: set[str] = set()
    for q in questions:
        s = q.source_segment or ""
        if s and s not in seen_segs:
            seen_segs.add(s)
            segment_order.append(s)
    if segment_order:
        order_map = {s: i for i, s in enumerate(segment_order)}
        questions.sort(key=lambda q: order_map.get(q.source_segment or "", 999))

    return questions


@router.post("/generate")
async def generate_quiz(request: QuizGenerationRequest) -> Quiz:
    logger.info(
        "Quiz generation requested - note_id=%s preset=%s difficulty=%s types=%s",
        request.note_id, request.question_count_preset, request.difficulty, request.question_types,
    )

    note = store.load_note(request.note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if not (note.content or "").strip():
        raise HTTPException(status_code=400, detail="Note is empty — add some content before generating a quiz")

    note_content = note.content

    storage = load_quiz_storage()
    quiz_settings = storage.quiz_settings

    preset = request.question_count_preset or "ai_decides"
    question_count = PRESET_COUNTS.get(preset, None)
    # If no preset count, let AI decide
    if question_count is None and preset not in PRESET_COUNTS:
        question_count = quiz_settings.default_question_count

    preset_instruction = PRESET_INSTRUCTIONS.get(preset, "")

    question_types = list(request.question_types) if request.question_types else list(quiz_settings.allowed_question_types)
    if not question_types:
        question_types = ["multiple_choice", "answer_typing", "true_false"]

    base_prompt = (request.custom_prompt or quiz_settings.ai_prompt or DEFAULT_QUIZ_GENERATION_PROMPT).strip()

    try:
        questions = await generate_quiz_questions(
            note_title=note.meta.title,
            note_content=note_content,
            question_count=question_count,
            question_types=question_types,
            difficulty=request.difficulty,
            ai_prompt=base_prompt,
            preset_instruction=preset_instruction,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {exc}") from exc

    now = datetime.now(timezone.utc).isoformat()
    quiz = Quiz(
        note_id=request.note_id,
        title=f"Quiz: {note.meta.title}",
        questions=questions,
        created_at=now,
        updated_at=now,
    )

    storage.quizzes.append(quiz)
    save_quiz_storage(storage)
    return quiz


# ---------------------------------------------------------------------------
# List / get / delete
# ---------------------------------------------------------------------------

@router.get("/list")
async def list_quizzes(note_id: Optional[str] = None) -> List[Quiz]:
    storage = load_quiz_storage()
    quizzes = storage.quizzes
    if note_id:
        quizzes = [q for q in quizzes if q.note_id == note_id]
    return sorted(quizzes, key=lambda q: q.created_at, reverse=True)


@router.get("/coverage/{note_id}")
async def get_quiz_coverage(note_id: str) -> QuizCoverageResponse:
    """Get knowledge coverage for a note based on quiz answers.

    Segments the note text into small semantic chunks (1-3 sentences each)
    and colors each segment based on how well the corresponding quiz
    questions were answered:
    - Green: all questions for this segment were answered correctly
    - Yellow: some questions correct, some incorrect
    - Red: all questions for this segment were answered incorrectly
    - Gray: no questions mapped to this segment
    """
    import html as html_module
    import re

    note = store.load_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    storage = load_quiz_storage()
    quizzes = [q for q in storage.quizzes if q.note_id == note_id]

    empty_data = QuizCoverageData(note_id=note_id)
    if not quizzes:
        return QuizCoverageResponse(coverage_data=empty_data, coverage_html=None, apcg=None)

    all_results = [r for q in quizzes for r in q.results]
    if not all_results:
        return QuizCoverageResponse(coverage_data=empty_data, coverage_html=None, apcg=None)

    # Overall stats
    average_score = sum(r.percentage for r in all_results) / len(all_results)
    latest_result = max(all_results, key=lambda r: r.completed_at)

    # Collect all questions with their answers across all quizzes
    # Group by latest answer per question id
    question_answers: dict[str, dict] = {}
    for q in sorted(quizzes, key=lambda q: q.updated_at):
        for qq in q.questions:
            question_answers[qq.id] = {
                "id": qq.id,
                "question": qq.question,
                "correct_answer": qq.correct_answer,
                "is_correct": qq.is_correct,
                "source_segment": qq.source_segment or qq.source_excerpt or "",
                "type": qq.type,
            }

    # Segment the note text into small chunks
    text = note.content or ""
    segments = _segment_text(text)

    # Map questions to segments using source_segment word overlap
    for qid, qinfo in question_answers.items():
        seg_text = qinfo["source_segment"].strip()
        if not seg_text:
            continue
        seg_words = set(seg_text.lower().split())
        if not seg_words:
            continue

        best_idx = -1
        best_overlap_ratio = 0.0  # Use ratio instead of raw count for better matching
        for i, seg in enumerate(segments):
            para_words = set(seg["text"].lower().split())
            if not para_words:
                continue
            overlap_count = len(seg_words & para_words)
            # Ratio: how many of the question's source_segment words appear in this segment
            ratio = overlap_count / len(seg_words) if seg_words else 0
            # Also consider what fraction of the segment is covered
            seg_ratio = overlap_count / len(para_words) if para_words else 0
            # Use the geometric mean of both ratios for balanced matching
            combined = (ratio * seg_ratio) ** 0.5 if ratio > 0 and seg_ratio > 0 else 0
            if combined > best_overlap_ratio:
                best_overlap_ratio = combined
                best_idx = i

        # Only map if there's meaningful overlap (at least 30% of source_segment words match)
        if best_idx >= 0 and best_overlap_ratio > 0.15:
            segments[best_idx]["questions"].append(qinfo)

    # Determine status for each segment
    for seg in segments:
        qs = seg["questions"]
        if not qs:
            seg["status"] = "none"
        elif all(q["is_correct"] is True for q in qs):
            seg["status"] = "understood"
        elif any(q["is_correct"] is True for q in qs):
            seg["status"] = "partial"
        elif any(q["is_correct"] is False for q in qs):
            seg["status"] = "not_understood"
        else:
            seg["status"] = "none"

    # Build coverage HTML
    status_colors = {
        "understood": "background-color: rgba(34, 197, 94, 0.2); border-left: 3px solid #22c55e; padding: 2px 6px; border-radius: 2px; margin: 4px 0;",
        "partial": "background-color: rgba(234, 179, 8, 0.2); border-left: 3px solid #eab308; padding: 2px 6px; border-radius: 2px; margin: 4px 0;",
        "not_understood": "background-color: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; padding: 2px 6px; border-radius: 2px; margin: 4px 0;",
        "none": "color: #9ca3af; padding: 2px 6px; margin: 4px 0;",
    }
    status_labels = {
        "understood": "✓ Understood",
        "partial": "◐ Partially understood",
        "not_understood": "✗ Not understood",
        "none": "— No questions",
    }

    html_parts = []
    for seg in segments:
        escaped_text = html_module.escape(seg["text"])
        status = seg["status"]
        style = status_colors.get(status, "")
        label = status_labels.get(status, "")
        q_count = len(seg["questions"])
        title_parts = [f"[{label}]"]
        for q in seg["questions"]:
            mark = "✓" if q["is_correct"] else "✗"
            title_parts.append(f"  {mark} {q['question'][:60]}")
        title = "\n".join(title_parts)
        # Encode questions as JSON for frontend tooltip rendering
        questions_json = json.dumps([
            {"question": q["question"][:80], "is_correct": q["is_correct"], "type": q["type"]}
            for q in seg["questions"]
        ], ensure_ascii=False)
        questions_json_escaped = html_module.escape(questions_json)
        html_parts.append(
            f'<div class="knowledge-segment" style="{style}" '
            f'title="{html_module.escape(title)}" data-status="{status}" '
            f'data-questions="{q_count}" data-questions-json="{questions_json_escaped}">'
            f'{escaped_text}</div>'
        )

    coverage_html = "\n".join(html_parts)

    # Stats
    understood_count = sum(1 for s in segments if s["status"] == "understood")
    partial_count = sum(1 for s in segments if s["status"] == "partial")
    not_understood_count = sum(1 for s in segments if s["status"] == "not_understood")
    total_with_questions = sum(1 for s in segments if s["status"] != "none")
    total_segments = len(segments)

    # Coverage percentage: segments understood / segments with questions
    if total_with_questions > 0:
        coverage_percentage = round((understood_count + partial_count * 0.5) / total_with_questions * 100, 1)
    else:
        coverage_percentage = 0.0

    weak_qs = [q for q in question_answers.values() if q["is_correct"] is False]
    mastered_qs = [q for q in question_answers.values() if q["is_correct"] is True]
    weak_areas = sorted({q["question"][:80] + ("…" if len(q["question"]) > 80 else "") for q in weak_qs})[:8]
    mastered_areas = sorted({q["question"][:80] + ("…" if len(q["question"]) > 80 else "") for q in mastered_qs})[:8]

    coverage_data = QuizCoverageData(
        note_id=note_id,
        coverage_percentage=coverage_percentage,
        last_quiz_date=latest_result.completed_at,
        total_quizzes_taken=len(all_results),
        average_score=round(average_score, 1),
        weak_areas=weak_areas,
        mastered_areas=mastered_areas,
    )

    # Build a response that the frontend can use with CoverageView
    # Map to propositions format for the shared CoverageView component
    propositions = []
    for seg in segments:
        status = seg["status"]
        if status == "understood":
            core_score = 1.0
        elif status == "partial":
            core_score = 0.5
        elif status == "not_understood":
            core_score = 0.0
        else:
            core_score = 0.0
        propositions.append({
            "id": f"seg-{seg['index']}",
            "text": seg["text"][:120],
            "matched": status in ("understood", "partial"),
            "core_score": core_score,
            "questions": [
                {
                    "question": q["question"][:60],
                    "is_correct": q["is_correct"],
                    "type": q["type"],
                }
                for q in seg["questions"]
            ],
        })

    apcg_report = {
        "coverage": {
            "total_core": coverage_percentage / 100.0 if total_with_questions > 0 else 0,
            "total_exact": coverage_percentage / 100.0 if total_with_questions > 0 else 0,
            "propositions": propositions,
            "detected_mode": "quiz",
        },
        "html": coverage_html,
    }

    return QuizCoverageResponse(
        coverage_data=coverage_data,
        coverage_html=coverage_html,
        apcg=apcg_report,
    )


def _segment_text(text: str) -> list[dict]:
    """Split note text into small semantic chunks (1-3 sentences each).

    Strategy:
    1. Split by double newlines into paragraphs
    2. Further split long paragraphs by sentence boundaries
    3. Group very short sentences together
    Goal: each segment should be 1-3 sentences, small enough for a quiz
    question to map to, but large enough to carry meaningful context.
    """
    segments = []
    idx = 0

    # Split by double newline into blocks
    blocks = [b.strip() for b in re.split(r"\n\s*\n+", text) if b.strip()]
    if not blocks:
        blocks = [line.strip() for line in text.split("\n") if line.strip()]

    for block in blocks:
        # Split block into sentences
        # Match sentence endings: . ! ? followed by space or end of string
        # But don't split on abbreviations like "z.B.", "d.h.", "e.g."
        raw_sentences = re.split(r"(?<=[.!?])\s+", block)
        # Filter empty
        sentences = [s.strip() for s in raw_sentences if s.strip()]
        if not sentences:
            continue

        # Group sentences into chunks of 1-3 sentences
        # Prefer keeping short sentences together and letting long ones stand alone
        chunk = []
        chunk_len = 0
        for sent in sentences:
            sent_words = len(sent.split())
            # If adding this sentence would make chunk too long, flush current chunk
            if chunk and (chunk_len + sent_words > 50 or len(chunk) >= 3):
                segments.append({
                    "index": idx,
                    "text": " ".join(chunk),
                    "questions": [],
                    "status": "none",
                })
                idx += 1
                chunk = []
                chunk_len = 0

            # If a single sentence is very long (>60 words), it stands alone
            if sent_words > 60:
                if chunk:
                    segments.append({
                        "index": idx,
                        "text": " ".join(chunk),
                        "questions": [],
                        "status": "none",
                    })
                    idx += 1
                    chunk = []
                    chunk_len = 0
                segments.append({
                    "index": idx,
                    "text": sent,
                    "questions": [],
                    "status": "none",
                })
                idx += 1
            else:
                chunk.append(sent)
                chunk_len += sent_words

        # Flush remaining chunk
        if chunk:
            segments.append({
                "index": idx,
                "text": " ".join(chunk),
                "questions": [],
                "status": "none",
            })
            idx += 1

    # If we somehow got no segments, fall back to the whole text
    if not segments:
        segments.append({
            "index": 0,
            "text": text[:500],
            "questions": [],
            "status": "none",
        })

    return segments


def _result_to_dict(result) -> dict:
    """Serialize a CoverageResult (dataclass) or any object to dict."""
    if hasattr(result, "model_dump"):
        try:
            return result.model_dump()
        except Exception:
            pass
    try:
        import dataclasses
        if dataclasses.is_dataclass(result):
            return dataclasses.asdict(result)
    except Exception:
        pass
    try:
        return json.loads(json.dumps(result, default=lambda o: getattr(o, "__dict__", str(o))))
    except Exception:
        return {}


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str) -> Quiz:
    storage = load_quiz_storage()
    quiz = next((q for q in storage.quizzes if q.id == quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str) -> dict:
    storage = load_quiz_storage()
    before = len(storage.quizzes)
    storage.quizzes = [q for q in storage.quizzes if q.id != quiz_id]
    if len(storage.quizzes) == before:
        raise HTTPException(status_code=404, detail="Quiz not found")
    save_quiz_storage(storage)
    return {"success": True}


# ---------------------------------------------------------------------------
# Submit / results
# ---------------------------------------------------------------------------

def _normalize_typing_answer(value: str) -> str:
    """Lower-case, strip, collapse whitespace, strip outer punctuation."""
    v = (value or "").strip().lower()
    v = re.sub(r"\s+", " ", v)
    v = v.strip(".,;:!?\"'()[]{}")
    return v


@router.post("/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, request: QuizSubmissionRequest) -> QuizResult:
    storage = load_quiz_storage()
    quiz = next((q for q in storage.quizzes if q.id == quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    correct_count = 0
    for question in quiz.questions:
        raw_user = request.answers.get(question.id, "")
        question.user_answer = raw_user  # preserve the user's original text

        if question.type == "true_false":
            u = (raw_user or "").strip().lower()
            c = question.correct_answer.strip().lower()
            question.is_correct = u == c
        elif question.type == "multiple_choice":
            question.is_correct = (
                (raw_user or "").strip().lower() == question.correct_answer.strip().lower()
            )
        else:  # answer_typing
            question.is_correct = (
                _normalize_typing_answer(raw_user) == _normalize_typing_answer(question.correct_answer)
            )

        if question.is_correct:
            correct_count += 1

    total = len(quiz.questions)
    percentage = (correct_count / total * 100) if total > 0 else 0.0

    now_iso = datetime.now(timezone.utc).isoformat()
    result = QuizResult(
        total_questions=total,
        correct_answers=correct_count,
        incorrect_answers=total - correct_count,
        percentage=round(percentage, 1),
        completed_at=now_iso,
        question_types=sorted({q.type for q in quiz.questions}),
    )
    quiz.results.append(result)
    quiz.updated_at = now_iso
    save_quiz_storage(storage)

    logger.info(f"Quiz {quiz_id} submitted: {result.correct_answers}/{result.total_questions} = {result.percentage}%")
    return result


@router.get("/{quiz_id}/results")
async def get_quiz_results(quiz_id: str) -> List[QuizResult]:
    storage = load_quiz_storage()
    quiz = next((q for q in storage.quizzes if q.id == quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz.results
