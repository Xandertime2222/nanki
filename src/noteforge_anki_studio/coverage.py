from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import Any, Iterable

from .anki_connect import AnkiLibraryCard
from .models import Card, CoverageAnchor, NoteDocument

WORD_PATTERN = re.compile(r"\b\w+\b", re.UNICODE)
HEADING_PATTERN = re.compile(r"^(#{1,6})[ \t]+(.+?)\s*$", re.MULTILINE)
CLOZE_PATTERN = re.compile(r"\{\{c\d+::(.*?)(?:::(.*?))?\}\}")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
MARKDOWN_BRIDGE_CHARS = r"\s*_~`>#\[\]()!|"
COMMON_TERMS = {
    "about",
    "also",
    "because",
    "between",
    "dieser",
    "diese",
    "dieses",
    "durch",
    "eine",
    "einer",
    "eines",
    "einem",
    "einen",
    "europe",
    "have",
    "into",
    "that",
    "their",
    "there",
    "they",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
    "your",
    "from",
    "oder",
    "und",
    "ist",
    "sind",
    "der",
    "die",
    "das",
    "for",
    "and",
    "the",
    "ein",
    "eine",
}

CardLike = Card | AnkiLibraryCard


@dataclass(slots=True)
class Token:
    start: int
    end: int
    text: str


@dataclass(slots=True)
class Section:
    title: str
    level: int
    start: int
    end: int


@dataclass(slots=True)
class ResolvedRange:
    start: int
    end: int
    method: str
    selected_text: str


@dataclass(slots=True)
class RangeMatch:
    start: int
    end: int
    method: str


@dataclass(slots=True)
class SemanticWindow:
    start: int
    end: int
    keywords: set[str]


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def strip_cloze_markup(text: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        return match.group(1) or ""

    return CLOZE_PATTERN.sub(_replace, text or "")


def strip_html(text: str) -> str:
    return HTML_TAG_PATTERN.sub(" ", text or "")


def plain_card_text(text: str) -> str:
    return normalize_space(strip_html(strip_cloze_markup(text or "")))


def iter_tokens(content: str) -> list[Token]:
    return [Token(start=m.start(), end=m.end(), text=m.group(0)) for m in WORD_PATTERN.finditer(content)]


def parse_sections(content: str) -> list[Section]:
    headings = [
        Section(title=normalize_space(m.group(2)), level=len(m.group(1)), start=m.start(), end=m.end())
        for m in HEADING_PATTERN.finditer(content)
    ]
    if not headings:
        return [Section(title="Full note", level=1, start=0, end=len(content))]

    sections: list[Section] = []
    if normalize_space(content[: headings[0].start]):
        sections.append(Section(title="Introduction", level=1, start=0, end=headings[0].start))
    for index, heading in enumerate(headings):
        next_start = headings[index + 1].start if index + 1 < len(headings) else len(content)
        sections.append(Section(title=heading.title, level=heading.level, start=heading.start, end=next_start))
    return sections


def section_for_offset(sections: list[Section], offset: int) -> Section | None:
    for section in sections:
        if section.start <= offset < section.end:
            return section
    return sections[-1] if sections else None


def unique_preserve_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        normalized = normalize_space(value)
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        output.append(normalized)
    return output


def card_attr(card: CardLike, name: str, default: Any = "") -> Any:
    return getattr(card, name, default)


def card_origin(card: CardLike) -> str:
    return str(card_attr(card, "origin", "local"))


def card_search_candidates(card: CardLike) -> list[str]:
    anchor = card_attr(card, "coverage_anchor", None)
    anchor_text = anchor.selected_text if isinstance(anchor, CoverageAnchor) else ""
    front = plain_card_text(card_attr(card, "front", ""))
    back = plain_card_text(card_attr(card, "back", ""))
    extra = plain_card_text(card_attr(card, "extra", ""))
    source_excerpt = plain_card_text(card_attr(card, "source_excerpt", ""))
    candidates = unique_preserve_order([anchor_text, source_excerpt, front, back, extra])
    return [candidate for candidate in candidates if len(candidate) >= 3]


def exact_matches(content: str, excerpt: str) -> list[RangeMatch]:
    matches: list[RangeMatch] = []
    start = 0
    while True:
        index = content.find(excerpt, start)
        if index == -1:
            break
        matches.append(RangeMatch(start=index, end=index + len(excerpt), method="exact"))
        start = index + 1
    return matches


def casefold_matches(content: str, excerpt: str) -> list[RangeMatch]:
    matches: list[RangeMatch] = []
    content_folded = content.casefold()
    excerpt_folded = excerpt.casefold()
    start = 0
    while True:
        index = content_folded.find(excerpt_folded, start)
        if index == -1:
            break
        matches.append(RangeMatch(start=index, end=index + len(excerpt), method="casefold"))
        start = index + 1
    return matches


def regex_matches(content: str, excerpt: str, *, allow_markdown_bridges: bool = False) -> list[RangeMatch]:
    excerpt = excerpt.strip()
    if not excerpt:
        return []
    parts = [re.escape(part) for part in re.split(r"\s+", excerpt) if part]
    if not parts:
        return []
    if allow_markdown_bridges:
        bridge = f"(?:[{MARKDOWN_BRIDGE_CHARS}]+)"
        pattern_str = bridge.join(parts)
        method = "markdown-bridge"
    else:
        pattern_str = r"\s+".join(parts)
        method = "whitespace"
    try:
        pattern = re.compile(pattern_str, re.MULTILINE)
    except re.error:
        return []
    return [RangeMatch(start=m.start(), end=m.end(), method=method) for m in pattern.finditer(content)]


def gather_excerpt_matches(content: str, excerpt: str) -> list[RangeMatch]:
    excerpt = excerpt.strip()
    if not excerpt:
        return []
    for matches in (
        exact_matches(content, excerpt),
        casefold_matches(content, excerpt),
        regex_matches(content, excerpt, allow_markdown_bridges=False),
        regex_matches(content, excerpt, allow_markdown_bridges=True),
    ):
        if matches:
            deduped: dict[tuple[int, int], RangeMatch] = {}
            for match in matches:
                deduped[(match.start, match.end)] = match
            return list(deduped.values())
    return []


def locate_section_by_title(sections: list[Section], locator: str) -> list[Section]:
    normalized = normalize_space(locator).casefold()
    if not normalized:
        return []
    exact = [section for section in sections if section.title.casefold() == normalized]
    if exact:
        return exact
    return [section for section in sections if normalized in section.title.casefold()]


def score_match(content: str, match: RangeMatch, prefix_text: str, suffix_text: str) -> int:
    score = 0
    prefix = normalize_space(prefix_text)
    suffix = normalize_space(suffix_text)
    if prefix:
        before = normalize_space(content[max(0, match.start - max(180, len(prefix) + 16)) : match.start])
        if before.endswith(prefix):
            score += 3
        elif prefix in before:
            score += 1
    if suffix:
        after = normalize_space(content[match.end : min(len(content), match.end + max(180, len(suffix) + 16))])
        if after.startswith(suffix):
            score += 3
        elif suffix in after:
            score += 1
    return score


def match_from_anchor(content: str, sections: list[Section], anchor: CoverageAnchor | None, locator: str = "") -> ResolvedRange | None:
    if anchor is None:
        return None
    selected_text = normalize_space(anchor.selected_text)
    if anchor.raw_start is not None and anchor.raw_end is not None:
        start = max(0, anchor.raw_start)
        end = min(len(content), anchor.raw_end)
        if start < end:
            excerpt = content[start:end]
            if not selected_text or normalize_space(excerpt) == selected_text:
                return ResolvedRange(start=start, end=end, method="raw-range", selected_text=excerpt)
    if anchor.note_start is not None and anchor.note_end is not None:
        start = max(0, anchor.note_start)
        end = min(len(content), anchor.note_end)
        if start < end:
            excerpt = content[start:end]
            if not selected_text or normalize_space(excerpt) == selected_text:
                return ResolvedRange(start=start, end=end, method="note-range", selected_text=excerpt)
    if not selected_text:
        return None
    matches = gather_excerpt_matches(content, selected_text)
    if not matches:
        return None
    scoped_sections = locate_section_by_title(sections, locator or anchor.source_item_label)
    if scoped_sections:
        scoped = [m for m in matches if any(section.start <= m.start < section.end for section in scoped_sections)]
        if scoped:
            matches = scoped
    best = max(
        matches,
        key=lambda m: (
            score_match(content, m, anchor.prefix_text, anchor.suffix_text),
            -abs((anchor.raw_start or m.start) - m.start),
            -(m.end - m.start),
        ),
    )
    return ResolvedRange(start=best.start, end=best.end, method=best.method, selected_text=content[best.start : best.end])


def fallback_match_for_card(content: str, sections: list[Section], card: CardLike) -> ResolvedRange | None:
    anchor = card_attr(card, "coverage_anchor", None)
    prefix = anchor.prefix_text if isinstance(anchor, CoverageAnchor) else ""
    suffix = anchor.suffix_text if isinstance(anchor, CoverageAnchor) else ""
    for candidate in card_search_candidates(card):
        matches = gather_excerpt_matches(content, candidate)
        if not matches:
            continue
        scoped_sections = locate_section_by_title(sections, str(card_attr(card, "source_locator", "")))
        if scoped_sections:
            scoped = [m for m in matches if any(section.start <= m.start < section.end for section in scoped_sections)]
            if scoped:
                matches = scoped
        best = max(matches, key=lambda m: (score_match(content, m, prefix, suffix), -(m.end - m.start)))
        return ResolvedRange(start=best.start, end=best.end, method=f"fallback:{best.method}", selected_text=content[best.start : best.end])
    return None


def resolve_card_range(
    content: str,
    sections: list[Section],
    card: CardLike,
    *,
    tokens: list[Token] | None = None,
    semantic_windows: list[SemanticWindow] | None = None,
) -> ResolvedRange | None:
    return (
        match_from_anchor(content, sections, card_attr(card, "coverage_anchor", None), str(card_attr(card, "source_locator", "")))
        or fallback_match_for_card(content, sections, card)
        or semantic_match_from_candidates(
            content,
            sections,
            card,
            semantic_windows=semantic_windows or build_semantic_windows(content, tokens or iter_tokens(content)),
        )
    )


def excerpt_for_range(content: str, start: int, end: int, *, limit: int = 180) -> str:
    text = normalize_space(content[start:end])
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _build_gap(content: str, tokens: list[Token], sections: list[Section], start_index: int, end_index: int) -> dict:
    start = tokens[start_index].start
    end = tokens[end_index].end
    section = section_for_offset(sections, start)
    return {
        "start": start,
        "end": end,
        "word_count": end_index - start_index + 1,
        "section_title": section.title if section else "Full note",
        "excerpt": excerpt_for_range(content, start, end),
    }


def gaps_from_tokens(content: str, tokens: list[Token], token_cards: list[set[str]], sections: list[Section]) -> list[dict]:
    gaps: list[dict] = []
    gap_start_index: int | None = None
    for index, card_ids in enumerate(token_cards):
        if card_ids:
            if gap_start_index is not None:
                gaps.append(_build_gap(content, tokens, sections, gap_start_index, index - 1))
                gap_start_index = None
            continue
        if gap_start_index is None:
            gap_start_index = index
    if gap_start_index is not None and tokens:
        gaps.append(_build_gap(content, tokens, sections, gap_start_index, len(tokens) - 1))
    gaps.sort(key=lambda gap: (-gap["word_count"], gap["start"]))
    return gaps[:12]


def coverage_html(content: str, tokens: list[Token], token_cards: list[set[str]]) -> str:
    if not tokens:
        return '<pre class="coverage-text empty">No text available for coverage analysis.</pre>'
    parts: list[str] = ['<pre class="coverage-text">']
    cursor = 0
    for token, card_ids in zip(tokens, token_cards, strict=False):
        if cursor < token.start:
            parts.append(html.escape(content[cursor : token.start]))
        token_text = html.escape(content[token.start : token.end])
        if card_ids:
            ids = ",".join(sorted(card_ids))
            has_anki = any(card_id.startswith("anki:") for card_id in card_ids)
            has_local = any(not card_id.startswith("anki:") for card_id in card_ids)
            if has_anki and has_local:
                source_class = " mixed"
            elif has_anki:
                source_class = " anki"
            else:
                source_class = " local"
            extra_class = " multi" if len(card_ids) > 1 else ""
            title = html.escape(f"Covered by {len(card_ids)} card(s)")
            parts.append(
                f'<span class="coverage-token covered{extra_class}{source_class}" data-card-ids="{ids}" title="{title}">{token_text}</span>'
            )
        else:
            parts.append(f'<span class="coverage-token uncovered" title="No linked card">{token_text}</span>')
        cursor = token.end
    if cursor < len(content):
        parts.append(html.escape(content[cursor:]))
    parts.append("</pre>")
    return "".join(parts)


def has_alpha_character(text: str) -> bool:
    return any(character.isalpha() for character in (text or ""))



def keyword_set(text: str) -> set[str]:
    tokens = [match.group(0).casefold() for match in WORD_PATTERN.finditer(text)]
    return {
        token
        for token in tokens
        if len(token) >= 3 and token not in COMMON_TERMS and has_alpha_character(token)
    }



def build_semantic_windows(content: str, tokens: list[Token], *, window_size: int = 42, stride: int = 18) -> list[SemanticWindow]:
    if not tokens:
        return []
    windows: list[SemanticWindow] = []
    last_range: tuple[int, int] | None = None
    for start_index in range(0, len(tokens), max(1, stride)):
        end_index = min(len(tokens) - 1, start_index + max(1, window_size) - 1)
        start = tokens[start_index].start
        end = tokens[end_index].end
        current_range = (start, end)
        if current_range == last_range:
            continue
        keywords = keyword_set(content[start:end])
        if keywords:
            windows.append(SemanticWindow(start=start, end=end, keywords=keywords))
            last_range = current_range
        if end_index >= len(tokens) - 1:
            break
    if not windows:
        windows.append(SemanticWindow(start=0, end=len(content), keywords=keyword_set(content)))
    return windows



def semantic_overlap_score(candidate_terms: set[str], reference_terms: set[str]) -> float:
    if not candidate_terms or not reference_terms:
        return 0.0
    overlap = candidate_terms & reference_terms
    if not overlap:
        return 0.0
    overlap_count = len(overlap)
    return overlap_count + (overlap_count / max(1, len(candidate_terms))) + (overlap_count / max(1, len(reference_terms)))



def semantic_match_from_candidates(
    content: str,
    sections: list[Section],
    card: CardLike,
    *,
    semantic_windows: list[SemanticWindow],
) -> ResolvedRange | None:
    candidates = card_search_candidates(card)
    if not candidates:
        return None
    merged_terms = keyword_set(" ".join(candidates))
    if not merged_terms:
        return None

    scoped_sections = locate_section_by_title(sections, str(card_attr(card, "source_locator", "")))
    scoped_windows = [
        window
        for window in semantic_windows
        if any(section.start <= window.start < section.end for section in scoped_sections)
    ] if scoped_sections else semantic_windows
    if not scoped_windows:
        scoped_windows = semantic_windows

    best_window: SemanticWindow | None = None
    best_score = 0.0
    best_overlap_count = 0
    for window in scoped_windows:
        overlap = merged_terms & window.keywords
        overlap_count = len(overlap)
        if overlap_count == 0:
            continue
        score = semantic_overlap_score(merged_terms, window.keywords)
        if score > best_score or (score == best_score and overlap_count > best_overlap_count):
            best_window = window
            best_score = score
            best_overlap_count = overlap_count

    if best_window is None:
        return None

    minimum_overlap = 2 if len(merged_terms) >= 4 else 1
    if best_overlap_count < minimum_overlap and best_score < 1.8:
        return None

    return ResolvedRange(
        start=best_window.start,
        end=best_window.end,
        method="semantic-window",
        selected_text=content[best_window.start : best_window.end],
    )



def best_excerpt_for_candidates(content: str, candidates: Iterable[str], *, limit: int = 220) -> str:
    normalized_candidates = [plain_card_text(candidate) for candidate in candidates if plain_card_text(candidate)]
    if not content.strip():
        return ""
    for candidate in normalized_candidates:
        matches = gather_excerpt_matches(content, candidate)
        if matches:
            match = max(matches, key=lambda item: item.end - item.start)
            return excerpt_for_range(content, match.start, match.end, limit=limit)

    tokens = iter_tokens(content)
    windows = build_semantic_windows(content, tokens)
    synthetic_card = AnkiLibraryCard(
        id="synthetic",
        note_id=None,
        model_name="",
        deck_name="",
        type="basic",
        front=normalized_candidates[0] if normalized_candidates else "",
        back=" ".join(normalized_candidates[1:]),
    )
    resolved = semantic_match_from_candidates(content, parse_sections(content), synthetic_card, semantic_windows=windows)
    if resolved is not None:
        return excerpt_for_range(content, resolved.start, resolved.end, limit=limit)
    return excerpt_for_range(content, 0, len(content), limit=limit)



def card_overlaps_note(content: str, note_terms: set[str], card: AnkiLibraryCard) -> bool:
    content_folded = content.casefold()
    best_overlap = 0
    best_score = 0.0
    for candidate in card_search_candidates(card):
        candidate_folded = candidate.casefold()
        if len(candidate_folded) >= 8 and candidate_folded in content_folded:
            return True
        candidate_terms = keyword_set(candidate)
        overlap = len(candidate_terms & note_terms)
        best_overlap = max(best_overlap, overlap)
        best_score = max(best_score, semantic_overlap_score(candidate_terms, note_terms))
        if overlap >= 3:
            return True
        if overlap >= 2 and len(candidate) <= 220:
            return True
        if best_score >= 2.0:
            return True
    return best_overlap >= 1 and len(note_terms) <= 8


def apply_resolved_range(token_cards: list[set[str]], tokens: list[Token], card_id: str, resolved: ResolvedRange) -> int:
    covered_word_count = 0
    for index, token in enumerate(tokens):
        if token.end <= resolved.start:
            continue
        if token.start >= resolved.end:
            break
        if token.start < resolved.end and token.end > resolved.start:
            if card_id not in token_cards[index]:
                token_cards[index].add(card_id)
                covered_word_count += 1
    return covered_word_count


def build_card_result(card: CardLike, *, mapped: bool, resolved: ResolvedRange | None = None, covered_word_count: int = 0, section_title: str | None = None) -> dict[str, Any]:
    front_text = plain_card_text(str(card_attr(card, "front", "")))
    locator = str(card_attr(card, "source_locator", ""))
    source_excerpt = plain_card_text(str(card_attr(card, "source_excerpt", "")))
    payload: dict[str, Any] = {
        "id": str(card_attr(card, "id", "")),
        "type": str(card_attr(card, "type", "basic")),
        "origin": card_origin(card),
        "front": excerpt_for_range(front_text, 0, len(front_text), limit=80),
        "deck_name": str(card_attr(card, "deck_name", "Default")),
        "mapped": mapped,
        "method": resolved.method if resolved else None,
        "selected_text": excerpt_for_range(
            resolved.selected_text if resolved else (source_excerpt or front_text),
            0,
            len(resolved.selected_text if resolved else (source_excerpt or front_text)),
            limit=120,
        ),
        "source_locator": locator,
        "section_title": section_title,
        "covered_words": covered_word_count,
    }
    if resolved:
        payload["range_start"] = resolved.start
        payload["range_end"] = resolved.end
    note_id = card_attr(card, "note_id", None)
    if note_id is not None:
        payload["anki_note_id"] = note_id
    model_name = card_attr(card, "model_name", None)
    if model_name:
        payload["model_name"] = str(model_name)
    return payload


def build_note_coverage(
    note: NoteDocument,
    external_cards: list[AnkiLibraryCard] | None = None,
    *,
    anki_status: dict[str, Any] | None = None,
) -> dict:
    content = note.content or ""
    sections = parse_sections(content)
    tokens = iter_tokens(content)
    semantic_windows = build_semantic_windows(content, tokens)
    token_cards = [set() for _ in tokens]
    card_results: list[dict[str, Any]] = []
    local_cards = list(note.cards)
    external_cards = list(external_cards or [])
    note_terms = keyword_set(plain_card_text(content))
    external_candidates = [card for card in external_cards if card_overlaps_note(content, note_terms, card)]

    for card in local_cards:
        resolved = resolve_card_range(content, sections, card, tokens=tokens, semantic_windows=semantic_windows)
        if resolved is None:
            card_results.append(build_card_result(card, mapped=False))
            continue
        covered_word_count = apply_resolved_range(token_cards, tokens, str(card.id), resolved)
        section = section_for_offset(sections, resolved.start)
        card_results.append(
            build_card_result(
                card,
                mapped=True,
                resolved=resolved,
                covered_word_count=covered_word_count,
                section_title=section.title if section else None,
            )
        )

    matched_external_cards: list[dict[str, Any]] = []
    for card in external_candidates:
        resolved = resolve_card_range(content, sections, card, tokens=tokens, semantic_windows=semantic_windows)
        if resolved is None:
            continue
        covered_word_count = apply_resolved_range(token_cards, tokens, str(card.id), resolved)
        section = section_for_offset(sections, resolved.start)
        matched_external_cards.append(
            build_card_result(
                card,
                mapped=True,
                resolved=resolved,
                covered_word_count=covered_word_count,
                section_title=section.title if section else None,
            )
        )

    card_results.extend(matched_external_cards)
    covered_words = sum(1 for card_ids in token_cards if card_ids)
    total_words = len(tokens)
    coverage_percent = round((covered_words / total_words) * 100, 1) if total_words else 0.0

    section_payloads: list[dict] = []
    uncovered_section_count = 0
    for section in sections:
        section_indexes = [i for i, token in enumerate(tokens) if token.start < section.end and token.end > section.start]
        total_section_words = len(section_indexes)
        covered_section_words = sum(1 for i in section_indexes if token_cards[i])
        section_percent = round((covered_section_words / total_section_words) * 100, 1) if total_section_words else 0.0
        section_card_ids = sorted({card_id for i in section_indexes for card_id in token_cards[i]})
        if section_percent < 100:
            uncovered_section_count += 1
        section_payloads.append(
            {
                "title": section.title,
                "level": section.level,
                "start": section.start,
                "end": section.end,
                "total_words": total_section_words,
                "covered_words": covered_section_words,
                "coverage_percent": section_percent,
                "card_ids": section_card_ids,
            }
        )

    gaps = gaps_from_tokens(content, tokens, token_cards, sections)
    local_mapped_cards = sum(1 for item in card_results if item["origin"] == "local" and item["mapped"])
    local_unmapped_cards = len(local_cards) - local_mapped_cards
    anki_matched_cards = len(matched_external_cards)
    payload_anki_status = {
        "available": bool(anki_status.get("available", False)) if anki_status else False,
        "error": anki_status.get("error") if anki_status else None,
        "total_cards": len(external_cards),
        "considered_cards": len(external_candidates),
        "matched_cards": anki_matched_cards,
    }

    return {
        "stats": {
            "covered_words": covered_words,
            "total_words": total_words,
            "coverage_percent": coverage_percent,
            "total_cards": len(local_cards),
            "mapped_cards": local_mapped_cards + anki_matched_cards,
            "unmapped_cards": local_unmapped_cards,
            "local_mapped_cards": local_mapped_cards,
            "anki_total_cards": len(external_cards),
            "anki_considered_cards": len(external_candidates),
            "anki_matched_cards": anki_matched_cards,
            "coverage_card_count": local_mapped_cards + anki_matched_cards,
            "uncovered_sections": uncovered_section_count,
        },
        "cards": card_results,
        "sections": section_payloads,
        "gaps": gaps,
        "coverage_html": coverage_html(content, tokens, token_cards),
        "anki": payload_anki_status,
    }
