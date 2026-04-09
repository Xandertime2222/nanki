"""Sentence-level coverage analysis for Nanki.

Instead of word-level tokenization (which inflates coverage through single-word
matches and overly broad semantic windows), this module splits note content into
sentences and checks whether each sentence is meaningfully covered by at least
one flashcard.  The result is a far more accurate picture of what the user has
actually turned into study material.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import Any, Iterable

from .anki_connect import AnkiLibraryCard
from .models import Card, CoverageAnchor, NoteDocument

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

HEADING_PATTERN = re.compile(r"^(#{1,6})[ \t]+(.+?)\s*$", re.MULTILINE)
CLOZE_PATTERN = re.compile(r"\{\{c\d+::(.*?)(?:::(.*?))?\}\}")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
WORD_PATTERN = re.compile(r"\b\w+\b", re.UNICODE)

# Sentence boundary detection uses a function-based approach to avoid
# variable-width lookbehind limitations.
SENTENCE_BOUNDARY = re.compile(r"([.!?])\s+(?=[A-ZÄÖÜÉÈÊ0-9(\"„«\[])", re.UNICODE)
PARAGRAPH_BREAK = re.compile(r"\n\s*\n")
ABBREVIATIONS = frozenset({
    "z", "etc", "dr", "nr", "abb", "kap", "vgl", "ca", "mr", "ms", "vs",
    "prof", "bzw", "bsp", "inkl", "ggf", "evtl", "usw", "sog",
})

# ---------------------------------------------------------------------------
# Stop words (EN + DE) – filtered from keyword extraction
# ---------------------------------------------------------------------------

STOP_WORDS: frozenset[str] = frozenset({
    # English
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "was",
    "one", "our", "out", "had", "has", "its", "say", "she", "too", "use",
    "who", "how", "did", "get", "may", "him", "his", "now", "see", "two",
    "also", "back", "been", "from", "have", "here", "just", "know", "like",
    "look", "make", "many", "more", "much", "must", "only", "over", "some",
    "such", "take", "than", "that", "them", "then", "they", "this", "time",
    "very", "want", "well", "what", "when", "which", "will", "with", "your",
    "about", "could", "first", "into", "most", "other", "their", "there",
    "these", "think", "those", "under", "where", "would", "being", "does",
    "each", "every", "given", "made", "same", "should", "since", "still",
    "while",
    # German
    "der", "die", "das", "ein", "eine", "einer", "eines", "einem", "einen",
    "und", "ist", "sind", "war", "hat", "haben", "wird", "werden", "kann",
    "mit", "von", "auf", "für", "nicht", "sich", "bei", "aus", "nach",
    "wie", "als", "aber", "oder", "wenn", "auch", "noch", "nur", "über",
    "vor", "bis", "durch", "unter", "gegen", "ohne", "zwischen", "dieser",
    "diese", "dieses", "diesem", "diesen", "jeder", "jede", "jedes",
    "kein", "keine", "keiner", "keines", "hier", "dort", "dann", "weil",
    "dass", "denn", "zum", "zur", "dem", "den", "des", "was", "wer",
    "man", "sehr", "schon", "immer", "wieder", "mehr", "viel", "andere",
    "anderen", "anderer", "anderes", "anderem", "also", "bereits", "dabei",
    "damit", "dazu", "jedoch", "sowie", "werden", "wurden", "wird", "wurde",
    "können", "soll", "sollen", "muss", "müssen", "darf", "dürfen",
})

CardLike = Card | AnkiLibraryCard

# Backward-compat aliases used by ai.py
COMMON_TERMS = STOP_WORDS

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class Sentence:
    text: str
    start: int
    end: int
    is_heading: bool = False
    is_content: bool = True  # False for empty / whitespace-only


@dataclass(slots=True)
class Section:
    title: str
    level: int
    start: int
    end: int


@dataclass(slots=True)
class SentenceMapping:
    """Which card covers which sentence, and how confidently."""
    sentence_index: int
    card_id: str
    confidence: float
    method: str


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def strip_cloze_markup(text: str) -> str:
    return CLOZE_PATTERN.sub(lambda m: m.group(1) or "", text or "")


def strip_html(text: str) -> str:
    return HTML_TAG_PATTERN.sub(" ", text or "")


def plain_card_text(text: str) -> str:
    return normalize_space(strip_html(strip_cloze_markup(text or "")))


def has_alpha(text: str) -> bool:
    return any(c.isalpha() for c in (text or ""))


# ---------------------------------------------------------------------------
# Keyword & n-gram extraction
# ---------------------------------------------------------------------------


def extract_keywords(text: str) -> set[str]:
    """Return meaningful lowercase keywords, filtering stop words."""
    words = WORD_PATTERN.findall(text.lower())
    return {w for w in words if len(w) >= 3 and w not in STOP_WORDS and has_alpha(w)}


def extract_bigrams(text: str) -> set[tuple[str, str]]:
    """Extract consecutive-word pairs (bigrams) from text."""
    words = [w.lower() for w in WORD_PATTERN.findall(text) if len(w) >= 2 and has_alpha(w)]
    return {(words[i], words[i + 1]) for i in range(len(words) - 1)}


def extract_trigrams(text: str) -> set[tuple[str, str, str]]:
    """Extract consecutive-word triples (trigrams) from text."""
    words = [w.lower() for w in WORD_PATTERN.findall(text) if len(w) >= 2 and has_alpha(w)]
    return {(words[i], words[i + 1], words[i + 2]) for i in range(len(words) - 2)}


# ---------------------------------------------------------------------------
# Sentence splitting
# ---------------------------------------------------------------------------


def _is_abbreviation(text: str, dot_pos: int) -> bool:
    """Check if a period at dot_pos is part of an abbreviation."""
    # Walk backward to find the word before the dot
    i = dot_pos - 1
    while i >= 0 and text[i].isalpha():
        i -= 1
    word = text[i + 1:dot_pos].lower()
    if word in ABBREVIATIONS:
        return True
    # Single-letter abbreviation (e.g. "z. B.", "S. 4")
    if len(word) <= 1 and word.isalpha():
        return True
    return False


def _split_text_block(text: str, offset: int) -> list[Sentence]:
    """Split a text block (no headings) into sentences."""
    if not text.strip():
        return []

    # First split on paragraph breaks
    paragraphs: list[tuple[int, str]] = []
    last = 0
    for m in PARAGRAPH_BREAK.finditer(text):
        paragraphs.append((last, text[last:m.start()]))
        last = m.end()
    paragraphs.append((last, text[last:]))

    result: list[Sentence] = []
    for para_offset, para in paragraphs:
        if not para.strip():
            continue
        # Split paragraph into sentences at .!? followed by uppercase
        boundaries: list[int] = []
        for m in SENTENCE_BOUNDARY.finditer(para):
            punct_pos = m.start()
            if m.group(1) == "." and _is_abbreviation(para, punct_pos):
                continue
            # Split point is right after the punctuation
            boundaries.append(punct_pos + 1)

        # Build sentence spans
        starts = [0] + boundaries
        ends = boundaries + [len(para)]
        for s, e in zip(starts, ends):
            chunk = para[s:e].strip()
            if not chunk:
                continue
            # Find actual position in para (preserving whitespace offsets)
            actual_start = para_offset + s
            actual_end = para_offset + e
            abs_start = offset + actual_start
            abs_end = offset + actual_end
            result.append(Sentence(
                text=chunk,
                start=abs_start,
                end=abs_end,
                is_heading=False,
                is_content=len(chunk) >= 4 and has_alpha(chunk),
            ))

    return result


def split_sentences(content: str) -> list[Sentence]:
    """Split content into sentence-level chunks.

    Headings become their own sentence (is_heading=True).
    Very short or whitespace-only chunks are marked is_content=False.
    """
    if not content or not content.strip():
        return []

    heading_spans: list[tuple[int, int, str, int]] = []
    for m in HEADING_PATTERN.finditer(content):
        heading_spans.append((m.start(), m.end(), normalize_space(m.group(2)), len(m.group(1))))

    sentences: list[Sentence] = []
    cursor = 0

    for h_start, h_end, h_title, h_level in heading_spans:
        if cursor < h_start:
            sentences.extend(_split_text_block(content[cursor:h_start], cursor))
        sentences.append(Sentence(
            text=h_title,
            start=h_start,
            end=h_end,
            is_heading=True,
            is_content=False,
        ))
        cursor = h_end

    if cursor < len(content):
        sentences.extend(_split_text_block(content[cursor:], cursor))

    return sentences


# ---------------------------------------------------------------------------
# Section parsing  (unchanged API, needed for backward compat)
# ---------------------------------------------------------------------------


def parse_sections(content: str) -> list[Section]:
    headings = [
        Section(title=normalize_space(m.group(2)), level=len(m.group(1)),
                start=m.start(), end=m.end())
        for m in HEADING_PATTERN.finditer(content)
    ]
    if not headings:
        return [Section(title="Full note", level=1, start=0, end=len(content))]
    sections: list[Section] = []
    if normalize_space(content[:headings[0].start]):
        sections.append(Section(title="Introduction", level=1, start=0, end=headings[0].start))
    for i, h in enumerate(headings):
        next_start = headings[i + 1].start if i + 1 < len(headings) else len(content)
        sections.append(Section(title=h.title, level=h.level, start=h.start, end=next_start))
    return sections


def section_for_offset(sections: list[Section], offset: int) -> Section | None:
    for s in sections:
        if s.start <= offset < s.end:
            return s
    return sections[-1] if sections else None


# ---------------------------------------------------------------------------
# Card text extraction
# ---------------------------------------------------------------------------


def card_attr(card: CardLike, name: str, default: Any = "") -> Any:
    return getattr(card, name, default)


def card_origin(card: CardLike) -> str:
    return str(card_attr(card, "origin", "local"))


def card_texts(card: CardLike) -> list[str]:
    """Return all meaningful text fragments from a card."""
    anchor = card_attr(card, "coverage_anchor", None)
    anchor_text = anchor.selected_text if isinstance(anchor, CoverageAnchor) else ""
    front = plain_card_text(card_attr(card, "front", ""))
    back = plain_card_text(card_attr(card, "back", ""))
    extra = plain_card_text(card_attr(card, "extra", ""))
    source_excerpt = plain_card_text(card_attr(card, "source_excerpt", ""))
    seen: set[str] = set()
    result: list[str] = []
    for t in [anchor_text, source_excerpt, front, back, extra]:
        t = normalize_space(t)
        if not t or len(t) < 3:
            continue
        key = t.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(t)
    return result


def card_search_candidates(card: CardLike) -> list[str]:
    """Backward-compat alias for card_texts (used by ai.py)."""
    return card_texts(card)


def unique_preserve_order(values: Iterable[str]) -> list[str]:
    """Deduplicate strings preserving insertion order (used by ai.py)."""
    seen: set[str] = set()
    result: list[str] = []
    for v in values:
        v = normalize_space(v)
        if not v:
            continue
        key = v.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(v)
    return result


def card_all_keywords(card: CardLike) -> set[str]:
    """Merge keywords from all card text fields."""
    merged: set[str] = set()
    for t in card_texts(card):
        merged |= extract_keywords(t)
    return merged


def card_all_bigrams(card: CardLike) -> set[tuple[str, str]]:
    """Merge bigrams from all card text fields."""
    merged: set[tuple[str, str]] = set()
    for t in card_texts(card):
        merged |= extract_bigrams(t)
    return merged


# ---------------------------------------------------------------------------
# Sentence matching
# ---------------------------------------------------------------------------


def _anchor_sentence_indices(
    sentences: list[Sentence], anchor: CoverageAnchor | None, content: str,
) -> list[int]:
    """Find sentence indices that overlap the anchor's stored range."""
    if anchor is None:
        return []
    # Try raw_start/raw_end first, then note_start/note_end
    start = end = None
    for s_attr, e_attr in [("raw_start", "raw_end"), ("note_start", "note_end")]:
        s = getattr(anchor, s_attr, None)
        e = getattr(anchor, e_attr, None)
        if s is not None and e is not None and s < e:
            start, end = max(0, s), min(len(content), e)
            break
    if start is None or end is None:
        return []
    return [i for i, sent in enumerate(sentences)
            if sent.end > start and sent.start < end and sent.is_content]


def _substring_sentence_indices(
    sentences: list[Sentence], text: str,
) -> list[int]:
    """Find sentences whose text contains the given substring (case-insensitive)."""
    if not text or len(text) < 6:
        return []
    text_lower = text.lower()
    indices: list[int] = []
    for i, sent in enumerate(sentences):
        if not sent.is_content:
            continue
        if text_lower in sent.text.lower():
            indices.append(i)
    return indices


def _find_in_content(content: str, excerpt: str) -> list[tuple[int, int]]:
    """Find all occurrences of excerpt in content (case-insensitive)."""
    if not excerpt or len(excerpt) < 6:
        return []
    content_lower = content.lower()
    excerpt_lower = excerpt.lower()
    matches = []
    start = 0
    while True:
        idx = content_lower.find(excerpt_lower, start)
        if idx == -1:
            break
        matches.append((idx, idx + len(excerpt)))
        start = idx + 1
    return matches


def _excerpt_sentence_indices(
    sentences: list[Sentence], content: str, excerpt: str,
) -> list[int]:
    """Find sentences that overlap with positions where excerpt appears in content."""
    spans = _find_in_content(content, excerpt)
    if not spans:
        return []
    indices: set[int] = set()
    for span_start, span_end in spans:
        for i, sent in enumerate(sentences):
            if sent.is_content and sent.end > span_start and sent.start < span_end:
                indices.add(i)
    return sorted(indices)


def _bigram_overlap_score(sent_bigrams: set[tuple[str, str]], card_bigrams: set[tuple[str, str]]) -> float:
    """Fraction of card bigrams found in the sentence."""
    if not card_bigrams:
        return 0.0
    overlap = len(sent_bigrams & card_bigrams)
    return overlap / len(card_bigrams)


def _keyword_jaccard(sent_kw: set[str], card_kw: set[str]) -> float:
    """Weighted Jaccard: longer keywords count more."""
    if not sent_kw or not card_kw:
        return 0.0
    overlap = sent_kw & card_kw
    if not overlap:
        return 0.0
    # Weight by word length (longer = more specific = more informative)
    overlap_weight = sum(len(w) for w in overlap)
    union_weight = sum(len(w) for w in (sent_kw | card_kw))
    return overlap_weight / max(1, union_weight)


MIN_BIGRAM_CONFIDENCE = 0.25   # ≥25% of card bigrams in sentence
MIN_KEYWORD_CONFIDENCE = 0.15  # ≥15% weighted Jaccard


def match_card_to_sentences(
    sentences: list[Sentence],
    content: str,
    sections: list[Section],
    card: CardLike,
    *,
    sentence_keywords: list[set[str]] | None = None,
    sentence_bigrams: list[set[tuple[str, str]]] | None = None,
) -> list[SentenceMapping]:
    """Map a card to the sentences it covers, using a multi-level strategy.

    Levels (tried in order, first success wins):
      1. Anchor range → overlapping sentences
      2. Source excerpt / selected_text found in content → overlapping sentences
      3. Bigram overlap between card and sentence
      4. Weighted keyword Jaccard between card and sentence
    """
    card_id = str(card_attr(card, "id", ""))
    anchor = card_attr(card, "coverage_anchor", None)
    mappings: list[SentenceMapping] = []

    # Level 1: Anchor-based
    if isinstance(anchor, CoverageAnchor):
        indices = _anchor_sentence_indices(sentences, anchor, content)
        if indices:
            for idx in indices:
                mappings.append(SentenceMapping(idx, card_id, 1.0, "anchor"))
            return mappings

    # Level 2: Direct text match (source_excerpt, selected_text, front)
    texts = card_texts(card)
    for t in texts:
        indices = _excerpt_sentence_indices(sentences, content, t)
        if indices:
            for idx in indices:
                mappings.append(SentenceMapping(idx, card_id, 0.9, "text-match"))
            return mappings

    # Level 3: Bigram overlap
    c_bigrams = card_all_bigrams(card)
    if c_bigrams and sentence_bigrams:
        best_idx = -1
        best_score = 0.0
        for i, s_bigrams in enumerate(sentence_bigrams):
            if not sentences[i].is_content:
                continue
            score = _bigram_overlap_score(s_bigrams, c_bigrams)
            if score > best_score:
                best_score = score
                best_idx = i
        if best_score >= MIN_BIGRAM_CONFIDENCE and best_idx >= 0:
            mappings.append(SentenceMapping(best_idx, card_id, best_score, "bigram"))
            return mappings

    # Level 4: Keyword Jaccard
    c_keywords = card_all_keywords(card)
    if c_keywords and sentence_keywords:
        best_idx = -1
        best_score = 0.0
        for i, s_kw in enumerate(sentence_keywords):
            if not sentences[i].is_content:
                continue
            score = _keyword_jaccard(s_kw, c_keywords)
            if score > best_score:
                best_score = score
                best_idx = i
        if best_score >= MIN_KEYWORD_CONFIDENCE and best_idx >= 0:
            mappings.append(SentenceMapping(best_idx, card_id, best_score, "keyword"))
            return mappings

    return []


# ---------------------------------------------------------------------------
# Coverage HTML (sentence-level highlighting)
# ---------------------------------------------------------------------------


def coverage_html(content: str, sentences: list[Sentence], sentence_cards: list[set[str]]) -> str:
    """Render content with sentence-level coverage highlighting."""
    if not sentences:
        return '<pre class="coverage-text empty">No text available for coverage analysis.</pre>'

    parts: list[str] = ['<pre class="coverage-text">']
    cursor = 0

    for sent, card_ids in zip(sentences, sentence_cards, strict=False):
        # Add any gap between cursor and this sentence
        if cursor < sent.start:
            parts.append(html.escape(content[cursor:sent.start]))

        sent_html = html.escape(content[sent.start:sent.end])

        if sent.is_heading:
            parts.append(sent_html)
        elif card_ids:
            has_anki = any(cid.startswith("anki:") for cid in card_ids)
            has_local = any(not cid.startswith("anki:") for cid in card_ids)
            if has_anki and has_local:
                src_cls = " mixed"
            elif has_anki:
                src_cls = " anki"
            else:
                src_cls = " local"
            multi_cls = " multi" if len(card_ids) > 1 else ""
            ids = ",".join(sorted(card_ids))
            title = html.escape(f"Covered by {len(card_ids)} card(s)")
            parts.append(
                f'<span class="coverage-token covered{multi_cls}{src_cls}" '
                f'data-card-ids="{ids}" title="{title}">{sent_html}</span>'
            )
        else:
            parts.append(
                f'<span class="coverage-token uncovered" title="No linked card">{sent_html}</span>'
            )

        cursor = sent.end

    if cursor < len(content):
        parts.append(html.escape(content[cursor:]))

    parts.append("</pre>")
    return "".join(parts)


# ---------------------------------------------------------------------------
# Gap detection
# ---------------------------------------------------------------------------


def _build_gap(content: str, sentences: list[Sentence], sections: list[Section],
               start_idx: int, end_idx: int) -> dict:
    start = sentences[start_idx].start
    end = sentences[end_idx].end
    count = end_idx - start_idx + 1
    section = section_for_offset(sections, start)
    text = normalize_space(content[start:end])
    excerpt = text if len(text) <= 180 else text[:179].rstrip() + "…"
    return {
        "start": start,
        "end": end,
        "sentence_count": count,
        "word_count": len(WORD_PATTERN.findall(content[start:end])),
        "section_title": section.title if section else "Full note",
        "excerpt": excerpt,
    }


def find_gaps(content: str, sentences: list[Sentence], sentence_cards: list[set[str]],
              sections: list[Section]) -> list[dict]:
    """Find runs of consecutive uncovered content sentences."""
    content_indices = [i for i, s in enumerate(sentences) if s.is_content]
    gaps: list[dict] = []
    run_start: int | None = None
    for ci in content_indices:
        if sentence_cards[ci]:
            if run_start is not None:
                gaps.append(_build_gap(content, sentences, sections, run_start, prev_ci))
                run_start = None
        else:
            if run_start is None:
                run_start = ci
            prev_ci = ci
    if run_start is not None:
        gaps.append(_build_gap(content, sentences, sections, run_start, content_indices[-1]))
    gaps.sort(key=lambda g: (-g["sentence_count"], g["start"]))
    return gaps[:12]


# ---------------------------------------------------------------------------
# Anki card filtering
# ---------------------------------------------------------------------------


def card_overlaps_note(content: str, note_kw: set[str], card: AnkiLibraryCard) -> bool:
    """Check whether an Anki library card is likely relevant to this note."""
    content_lower = content.lower()
    for candidate in card_texts(card):
        candidate_lower = candidate.lower()
        # Strong signal: a long substring match
        if len(candidate_lower) >= 12 and candidate_lower in content_lower:
            return True
        candidate_kw = extract_keywords(candidate)
        overlap = candidate_kw & note_kw
        if len(overlap) >= 3:
            return True
        jaccard = _keyword_jaccard(candidate_kw, note_kw)
        if jaccard >= 0.12:
            return True
    return False


# ---------------------------------------------------------------------------
# Public: best_excerpt_for_candidates  (used by AI module)
# ---------------------------------------------------------------------------


def best_excerpt_for_candidates(content: str, candidates: Iterable[str], *, limit: int = 220) -> str:
    normalized = [plain_card_text(c) for c in candidates if plain_card_text(c)]
    if not content.strip():
        return ""
    for candidate in normalized:
        spans = _find_in_content(content, candidate)
        if spans:
            best = max(spans, key=lambda s: s[1] - s[0])
            text = normalize_space(content[best[0]:best[1]])
            return text if len(text) <= limit else text[:limit - 1].rstrip() + "…"
    # Fallback: keyword overlap to find best region
    merged_kw = set()
    for c in normalized:
        merged_kw |= extract_keywords(c)
    if merged_kw:
        sentences = split_sentences(content)
        best_sent = None
        best_score = 0.0
        for sent in sentences:
            if not sent.is_content:
                continue
            score = _keyword_jaccard(extract_keywords(sent.text), merged_kw)
            if score > best_score:
                best_score = score
                best_sent = sent
        if best_sent:
            text = normalize_space(best_sent.text)
            return text if len(text) <= limit else text[:limit - 1].rstrip() + "…"
    text = normalize_space(content)
    return text if len(text) <= limit else text[:limit - 1].rstrip() + "…"


# ---------------------------------------------------------------------------
# Build card result (unchanged shape for API compat)
# ---------------------------------------------------------------------------


def _excerpt(text: str, limit: int = 120) -> str:
    text = normalize_space(text)
    return text if len(text) <= limit else text[:limit - 1].rstrip() + "…"


def build_card_result(
    card: CardLike, *, mapped: bool,
    matched_sentences: list[SentenceMapping] | None = None,
    content: str = "",
    sections: list[Section] | None = None,
) -> dict[str, Any]:
    front_text = plain_card_text(str(card_attr(card, "front", "")))
    locator = str(card_attr(card, "source_locator", ""))
    source_excerpt = plain_card_text(str(card_attr(card, "source_excerpt", "")))

    method = matched_sentences[0].method if matched_sentences else None
    section_title = None
    range_start = range_end = None

    if matched_sentences and sections and content:
        first = matched_sentences[0]
        sec = section_for_offset(sections, 0)
        # Find the actual section from the sentence start offset
        for s in sections:
            # Use a rough mapping from sentence_index → content offset
            pass
        section_title = None

    selected = source_excerpt or front_text

    if matched_sentences and content:
        # Use the matched sentence text as selected_text
        # Gather all sentence indices and find their text
        indices = [m.sentence_index for m in matched_sentences]
        sentences = split_sentences(content)
        if sentences and indices:
            first_sent = sentences[indices[0]] if indices[0] < len(sentences) else None
            last_sent = sentences[indices[-1]] if indices[-1] < len(sentences) else None
            if first_sent and last_sent:
                range_start = first_sent.start
                range_end = last_sent.end
                selected = normalize_space(content[range_start:range_end])
                section_title_sec = section_for_offset(sections, first_sent.start) if sections else None
                section_title = section_title_sec.title if section_title_sec else None

    payload: dict[str, Any] = {
        "id": str(card_attr(card, "id", "")),
        "type": str(card_attr(card, "type", "basic")),
        "origin": card_origin(card),
        "front": _excerpt(front_text, limit=80),
        "deck_name": str(card_attr(card, "deck_name", "Default")),
        "mapped": mapped,
        "method": method,
        "selected_text": _excerpt(selected),
        "source_locator": locator,
        "section_title": section_title,
        "covered_words": len(matched_sentences) if matched_sentences else 0,
    }
    if range_start is not None:
        payload["range_start"] = range_start
        payload["range_end"] = range_end

    note_id = card_attr(card, "note_id", None)
    if note_id is not None:
        payload["anki_note_id"] = note_id
    model_name = card_attr(card, "model_name", None)
    if model_name:
        payload["model_name"] = str(model_name)
    return payload


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def build_note_coverage(
    note: NoteDocument,
    external_cards: list[AnkiLibraryCard] | None = None,
    *,
    anki_status: dict[str, Any] | None = None,
) -> dict:
    content = note.content or ""
    sections = parse_sections(content)
    sentences = split_sentences(content)
    content_sentences = [s for s in sentences if s.is_content]

    # Pre-compute keywords and bigrams for each sentence
    sentence_keywords = [extract_keywords(s.text) if s.is_content else set() for s in sentences]
    sentence_bigrams = [extract_bigrams(s.text) if s.is_content else set() for s in sentences]

    # Per-sentence card sets
    sentence_cards: list[set[str]] = [set() for _ in sentences]

    local_cards = list(note.cards)
    external_cards = list(external_cards or [])
    note_kw = extract_keywords(plain_card_text(content))
    external_candidates = [c for c in external_cards if card_overlaps_note(content, note_kw, c)]

    card_results: list[dict[str, Any]] = []

    # Map local cards
    for card in local_cards:
        mappings = match_card_to_sentences(
            sentences, content, sections, card,
            sentence_keywords=sentence_keywords,
            sentence_bigrams=sentence_bigrams,
        )
        if not mappings:
            card_results.append(build_card_result(card, mapped=False))
            continue
        for m in mappings:
            sentence_cards[m.sentence_index].add(str(card.id))
        card_results.append(build_card_result(
            card, mapped=True, matched_sentences=mappings,
            content=content, sections=sections,
        ))

    # Map external (Anki) cards
    matched_external: list[dict[str, Any]] = []
    for card in external_candidates:
        mappings = match_card_to_sentences(
            sentences, content, sections, card,
            sentence_keywords=sentence_keywords,
            sentence_bigrams=sentence_bigrams,
        )
        if not mappings:
            continue
        for m in mappings:
            sentence_cards[m.sentence_index].add(f"anki:{card.id}")
        matched_external.append(build_card_result(
            card, mapped=True, matched_sentences=mappings,
            content=content, sections=sections,
        ))

    card_results.extend(matched_external)

    # Compute stats
    total_content = len(content_sentences)
    covered_content = sum(1 for i, s in enumerate(sentences) if s.is_content and sentence_cards[i])
    coverage_pct = round((covered_content / total_content) * 100, 1) if total_content else 0.0

    # Section stats
    section_payloads: list[dict] = []
    uncovered_section_count = 0
    for sec in sections:
        sec_indices = [i for i, s in enumerate(sentences)
                       if s.is_content and s.start < sec.end and s.end > sec.start]
        total_sec = len(sec_indices)
        covered_sec = sum(1 for i in sec_indices if sentence_cards[i])
        sec_pct = round((covered_sec / total_sec) * 100, 1) if total_sec else 0.0
        sec_card_ids = sorted({cid for i in sec_indices for cid in sentence_cards[i]})
        if sec_pct < 100:
            uncovered_section_count += 1
        section_payloads.append({
            "title": sec.title,
            "level": sec.level,
            "start": sec.start,
            "end": sec.end,
            "total_words": total_sec,       # re-using field name for compat
            "covered_words": covered_sec,    # re-using field name for compat
            "coverage_percent": sec_pct,
            "card_ids": sec_card_ids,
        })

    # Gaps
    gaps = find_gaps(content, sentences, sentence_cards, sections)

    local_mapped = sum(1 for r in card_results if r["origin"] == "local" and r["mapped"])
    local_unmapped = len(local_cards) - local_mapped
    anki_matched = len(matched_external)

    payload_anki = {
        "available": bool(anki_status.get("available", False)) if anki_status else False,
        "error": anki_status.get("error") if anki_status else None,
        "total_cards": len(external_cards),
        "considered_cards": len(external_candidates),
        "matched_cards": anki_matched,
    }

    return {
        "stats": {
            "covered_words": covered_content,   # field name kept for compat
            "total_words": total_content,        # field name kept for compat
            "coverage_percent": coverage_pct,
            "total_cards": len(local_cards),
            "mapped_cards": local_mapped + anki_matched,
            "unmapped_cards": local_unmapped,
            "local_mapped_cards": local_mapped,
            "anki_total_cards": len(external_cards),
            "anki_considered_cards": len(external_candidates),
            "anki_matched_cards": anki_matched,
            "coverage_card_count": local_mapped + anki_matched,
            "uncovered_sections": uncovered_section_count,
            "unit": "sentences",  # signal to frontend
        },
        "cards": card_results,
        "sections": section_payloads,
        "gaps": gaps,
        "coverage_html": coverage_html(content, sentences, sentence_cards),
        "anki": payload_anki,
    }
