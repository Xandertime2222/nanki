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
ABBREVIATIONS = frozenset(
    {
        "z",
        "etc",
        "dr",
        "nr",
        "abb",
        "kap",
        "vgl",
        "ca",
        "mr",
        "ms",
        "vs",
        "prof",
        "bzw",
        "bsp",
        "inkl",
        "ggf",
        "evtl",
        "usw",
        "sog",
    }
)

# ---------------------------------------------------------------------------
# Stop words (EN + DE) – filtered from keyword extraction
# ---------------------------------------------------------------------------

STOP_WORDS: frozenset[str] = frozenset(
    {
        # English
        "the",
        "and",
        "for",
        "are",
        "but",
        "not",
        "you",
        "all",
        "can",
        "was",
        "one",
        "our",
        "out",
        "had",
        "has",
        "its",
        "say",
        "she",
        "too",
        "use",
        "who",
        "how",
        "did",
        "get",
        "may",
        "him",
        "his",
        "now",
        "see",
        "two",
        "also",
        "back",
        "been",
        "from",
        "have",
        "here",
        "just",
        "know",
        "like",
        "look",
        "make",
        "many",
        "more",
        "much",
        "must",
        "only",
        "over",
        "some",
        "such",
        "take",
        "than",
        "that",
        "them",
        "then",
        "they",
        "this",
        "time",
        "very",
        "want",
        "well",
        "what",
        "when",
        "which",
        "will",
        "with",
        "your",
        "about",
        "could",
        "first",
        "into",
        "most",
        "other",
        "their",
        "there",
        "these",
        "think",
        "those",
        "under",
        "where",
        "would",
        "being",
        "does",
        "each",
        "every",
        "given",
        "made",
        "same",
        "should",
        "since",
        "still",
        "while",
        # German
        "der",
        "die",
        "das",
        "ein",
        "eine",
        "einer",
        "eines",
        "einem",
        "einen",
        "und",
        "ist",
        "sind",
        "war",
        "hat",
        "haben",
        "wird",
        "werden",
        "kann",
        "mit",
        "von",
        "auf",
        "für",
        "nicht",
        "sich",
        "bei",
        "aus",
        "nach",
        "wie",
        "als",
        "aber",
        "oder",
        "wenn",
        "auch",
        "noch",
        "nur",
        "über",
        "vor",
        "bis",
        "durch",
        "unter",
        "gegen",
        "ohne",
        "zwischen",
        "dieser",
        "diese",
        "dieses",
        "diesem",
        "diesen",
        "jeder",
        "jede",
        "jedes",
        "kein",
        "keine",
        "keiner",
        "keines",
        "hier",
        "dort",
        "dann",
        "weil",
        "dass",
        "denn",
        "zum",
        "zur",
        "dem",
        "den",
        "des",
        "was",
        "wer",
        "man",
        "sehr",
        "schon",
        "immer",
        "wieder",
        "mehr",
        "viel",
        "andere",
        "anderen",
        "anderer",
        "anderes",
        "anderem",
        "also",
        "bereits",
        "dabei",
        "damit",
        "dazu",
        "jedoch",
        "sowie",
        "werden",
        "wurden",
        "wird",
        "wurde",
        "können",
        "soll",
        "sollen",
        # Meta-terms that cause false positives in both languages
        "text",
        "note",
        "notes",
        "card",
        "cards",
        "content",
        "section",
        "sections",
        "information",
        "example",
        "examples",
        "page",
        "pages",
        "chapter",
        "chapters",
        "topic",
        "topics",
        "part",
        "parts",
        "point",
        "points",
        "way",
        "ways",
        "thing",
        "things",
        "kind",
        "kinds",
        "type",
        "types",
        "form",
        "forms",
        "case",
        "cases",
        "fact",
        "facts",
        "idea",
        "ideas",
        "concept",
        "concepts",
        "term",
        "terms",
        "word",
        "words",
        "sentence",
        "sentences",
        "paragraph",
        "paragraphs",
        "article",
        "articles",
        "definition",
        "definitions",
        "description",
        "descriptions",
        "explanation",
        "explanations",
        "detail",
        "details",
        "aspect",
        "aspects",
        "feature",
        "features",
        "element",
        "elements",
        "component",
        "components",
        "structure",
        "structures",
        "system",
        "systems",
        "method",
        "methods",
        "approach",
        "approaches",
        "process",
        "processes",
        "step",
        "steps",
        "result",
        "results",
        "outcome",
        "outcomes",
        "effect",
        "effects",
        "cause",
        "causes",
        "reason",
        "reasons",
        "purpose",
        "purposes",
        "function",
        "functions",
        "role",
        "roles",
        "use",
        "uses",
        "usage",
        "application",
        "applications",
        "context",
        "contexts",
        "level",
        "levels",
        "degree",
        "degrees",
        "range",
        "ranges",
        "area",
        "areas",
        "field",
        "fields",
        "domain",
        "domains",
        "category",
        "categories",
        "class",
        "classes",
        "group",
        "groups",
        "set",
        "sets",
        "list",
        "lists",
        "number",
        "numbers",
        "amount",
        "amounts",
        "quantity",
        "quantities",
        "value",
        "values",
        "data",
        "knowledge",
        "muss",
        "müssen",
        "darf",
        "dürfen",
    }
)

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


# Common German and English suffixes ordered longest-first so the longest
# match is removed first. Used for light stemming so morphological variants
# (e.g. "Welle" / "Wellen", "running" / "runs") collapse onto the same stem.
_DE_SUFFIXES = (
    "ungen",
    "lichen",
    "lichem",
    "licher",
    "liches",
    "lich",
    "isch",
    "iert",
    "ierte",
    "iertes",
    "ierten",
    "keit",
    "heit",
    "schaft",
    "ung",
    "ern",
    "end",
    "est",
    "en",
    "em",
    "er",
    "es",
    "et",
    "te",
    "st",
    "ts",
    "n",
    "s",
    "e",
)
_EN_SUFFIXES = (
    "ational",
    "tional",
    "ization",
    "ational",
    "fulness",
    "ousness",
    "iveness",
    "ation",
    "ement",
    "ness",
    "ling",
    "able",
    "ible",
    "ment",
    "ence",
    "ance",
    "ical",
    "ious",
    "ously",
    "ing",
    "ies",
    "ied",
    "est",
    "ers",
    "ity",
    "ed",
    "es",
    "ly",
    "er",
    "or",
    "al",
    "s",
)


def _strip_suffix(word: str, suffixes: tuple[str, ...]) -> str:
    for suf in suffixes:
        if len(word) > len(suf) + 2 and word.endswith(suf):
            return word[: -len(suf)]
    return word


def stem_word(word: str) -> str:
    """Light stem suitable for EN + DE text. Not linguistically perfect,
    but good enough to collapse the most common inflections so contextual
    matching can compare meaning rather than surface form.
    """
    w = word.lower()
    if len(w) <= 3:
        return w
    # German first (more aggressive), then English suffixes
    w = _strip_suffix(w, _DE_SUFFIXES)
    w = _strip_suffix(w, _EN_SUFFIXES)
    # Collapse umlauts to ASCII so "Größe" and "Groesse" align.
    w = w.replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss")
    return w


def extract_stems(text: str) -> set[str]:
    """Stemmed lowercase keywords, filtered against stop words."""
    words = WORD_PATTERN.findall((text or "").lower())
    out: set[str] = set()
    for w in words:
        if len(w) < 3 or not has_alpha(w):
            continue
        if w in STOP_WORDS:
            continue
        stem = stem_word(w)
        if len(stem) >= 3:
            out.add(stem)
    return out


def extract_char_ngrams(text: str, n: int = 4) -> set[str]:
    """Character n-grams over alphabetic runs. Captures fuzzy / morphological
    similarity so e.g. "Wellenlänge" and "wellenlangen" overlap heavily even
    if no exact word matches. We collapse umlauts and lowercase first.
    """
    if not text:
        return set()
    cleaned = (
        text.lower()
        .replace("ä", "a")
        .replace("ö", "o")
        .replace("ü", "u")
        .replace("ß", "ss")
    )
    out: set[str] = set()
    for token in re.findall(r"[a-z0-9]+", cleaned):
        if len(token) < n:
            out.add(token)
            continue
        for i in range(len(token) - n + 1):
            out.add(token[i : i + n])
    return out


def extract_keywords(text: str) -> set[str]:
    """Return meaningful lowercase keywords, filtering stop words."""
    words = WORD_PATTERN.findall(text.lower())
    return {w for w in words if len(w) >= 3 and w not in STOP_WORDS and has_alpha(w)}


def extract_bigrams(text: str) -> set[tuple[str, str]]:
    """Extract consecutive-word pairs (bigrams) from text."""
    words = [
        w.lower() for w in WORD_PATTERN.findall(text) if len(w) >= 2 and has_alpha(w)
    ]
    return {(words[i], words[i + 1]) for i in range(len(words) - 1)}


def extract_stem_bigrams(text: str) -> set[tuple[str, str]]:
    """Bigrams over stems with stop words filtered. Captures phrase-level
    context that survives reordering of inflection."""
    stems = []
    for w in WORD_PATTERN.findall((text or "").lower()):
        if len(w) < 3 or not has_alpha(w) or w in STOP_WORDS:
            continue
        stems.append(stem_word(w))
    return {(stems[i], stems[i + 1]) for i in range(len(stems) - 1)}


def extract_trigrams(text: str) -> set[tuple[str, str, str]]:
    """Extract consecutive-word triples (trigrams) from text."""
    words = [
        w.lower() for w in WORD_PATTERN.findall(text) if len(w) >= 2 and has_alpha(w)
    ]
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
    word = text[i + 1 : dot_pos].lower()
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
        paragraphs.append((last, text[last : m.start()]))
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
            result.append(
                Sentence(
                    text=chunk,
                    start=abs_start,
                    end=abs_end,
                    is_heading=False,
                    is_content=len(chunk) >= 4 and has_alpha(chunk),
                )
            )

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
        heading_spans.append(
            (m.start(), m.end(), normalize_space(m.group(2)), len(m.group(1)))
        )

    sentences: list[Sentence] = []
    cursor = 0

    for h_start, h_end, h_title, h_level in heading_spans:
        if cursor < h_start:
            sentences.extend(_split_text_block(content[cursor:h_start], cursor))
        sentences.append(
            Sentence(
                text=h_title,
                start=h_start,
                end=h_end,
                is_heading=True,
                is_content=False,
            )
        )
        cursor = h_end

    if cursor < len(content):
        sentences.extend(_split_text_block(content[cursor:], cursor))

    return sentences


# ---------------------------------------------------------------------------
# Section parsing  (unchanged API, needed for backward compat)
# ---------------------------------------------------------------------------


def parse_sections(content: str) -> list[Section]:
    headings = [
        Section(
            title=normalize_space(m.group(2)),
            level=len(m.group(1)),
            start=m.start(),
            end=m.end(),
        )
        for m in HEADING_PATTERN.finditer(content)
    ]
    if not headings:
        return [Section(title="Full note", level=1, start=0, end=len(content))]
    sections: list[Section] = []
    if normalize_space(content[: headings[0].start]):
        sections.append(
            Section(title="Introduction", level=1, start=0, end=headings[0].start)
        )
    for i, h in enumerate(headings):
        next_start = headings[i + 1].start if i + 1 < len(headings) else len(content)
        sections.append(
            Section(title=h.title, level=h.level, start=h.start, end=next_start)
        )
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


def card_all_stems(card: CardLike) -> set[str]:
    """Merge stemmed keywords from all card text fields."""
    merged: set[str] = set()
    for t in card_texts(card):
        merged |= extract_stems(t)
    return merged


def card_all_stem_bigrams(card: CardLike) -> set[tuple[str, str]]:
    merged: set[tuple[str, str]] = set()
    for t in card_texts(card):
        merged |= extract_stem_bigrams(t)
    return merged


def card_all_char_ngrams(card: CardLike, n: int = 4) -> set[str]:
    merged: set[str] = set()
    for t in card_texts(card):
        merged |= extract_char_ngrams(t, n=n)
    return merged


# ---------------------------------------------------------------------------
# Sentence matching
# ---------------------------------------------------------------------------


def _anchor_sentence_indices(
    sentences: list[Sentence],
    anchor: CoverageAnchor | None,
    content: str,
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
    return [
        i
        for i, sent in enumerate(sentences)
        if sent.end > start and sent.start < end and sent.is_content
    ]


def _substring_sentence_indices(
    sentences: list[Sentence],
    text: str,
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
    sentences: list[Sentence],
    content: str,
    excerpt: str,
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


def _stems_compatible(a: str, b: str) -> bool:
    """Treat two stems as compatible if either is a prefix of the other,
    with both stems at least 4 characters long. This bridges German
    compound words ("wellenartig", "wellenlaengen") to their root ("well")
    without requiring a full morphological analyzer.
    """
    if a == b:
        return True
    la, lb = len(a), len(b)
    if la < 4 or lb < 4:
        return False
    if la <= lb:
        return b.startswith(a)
    return a.startswith(b)


def _best_stem_match_length(
    card_stem: str, sent_stems: set[str], sent_prefix4: set[str]
) -> int:
    """Return the length of the longest sentence-stem that is compatible
    with this card stem (0 if none). Used so longer matches dominate.
    """
    if card_stem in sent_stems:
        return len(card_stem)
    if len(card_stem) < 4:
        return 0
    if card_stem[:4] not in sent_prefix4:
        return 0
    best = 0
    for ss in sent_stems:
        if _stems_compatible(card_stem, ss) and len(ss) > best:
            best = len(ss)
    return best


def _bigram_overlap_score(
    sent_bigrams: set[tuple[str, str]], card_bigrams: set[tuple[str, str]]
) -> float:
    """Fraction of card bigrams found in the sentence (prefix-aware)."""
    if not card_bigrams:
        return 0.0
    # Fast path: exact intersection.
    overlap = len(sent_bigrams & card_bigrams)
    # Slow path: count card bigrams that prefix-match a sentence bigram.
    matched: set[tuple[str, str]] = set(sent_bigrams & card_bigrams)
    remaining = card_bigrams - matched
    if remaining and sent_bigrams:
        for cb in remaining:
            ca, cb2 = cb
            for sb in sent_bigrams:
                if _stems_compatible(ca, sb[0]) and _stems_compatible(cb2, sb[1]):
                    overlap += 1
                    break
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


def _stem_recall(sent_stems: set[str], card_stems: set[str]) -> tuple[float, int]:
    """Length-weighted recall of card stems, with prefix-aware matching.

    Returns (score, longest_matched_card_stem_len). The second value lets
    callers reward strong matches on a single distinctive concept (e.g.
    matching "materiewell" is much stronger evidence than matching "der").
    """
    if not card_stems:
        return 0.0, 0
    sent_prefix4 = {s[:4] for s in sent_stems if len(s) >= 4}
    matched_weight = 0
    longest_match = 0
    for cs in card_stems:
        match_len = _best_stem_match_length(cs, sent_stems, sent_prefix4)
        if match_len:
            # Use the *card* stem length for the weight (we want recall of
            # the card's vocabulary, not the sentence's), but bonus the
            # min(card,sentence) so partial-prefix matches count for less.
            matched_weight += min(len(cs), match_len)
            if len(cs) > longest_match:
                longest_match = len(cs)
    card_weight = sum(len(s) for s in card_stems)
    return matched_weight / max(1, card_weight), longest_match


def _char_ngram_recall(sent_ngrams: set[str], card_ngrams: set[str]) -> float:
    """Fraction of the card's character n-grams that appear in the sentence.
    Recall (not Jaccard) keeps long sentences from being unfairly penalized.
    """
    if not card_ngrams:
        return 0.0
    return len(sent_ngrams & card_ngrams) / len(card_ngrams)


def _char_ngram_jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if not inter:
        return 0.0
    return inter / len(a | b)


@dataclass(slots=True)
class CardSignature:
    """Pre-computed contextual fingerprint of a card. Building this once per
    card lets us score it cheaply against every sentence."""

    stems: set[str]
    stem_bigrams: set[tuple[str, str]]
    char_ngrams: set[str]
    keywords: set[str]
    word_bigrams: set[tuple[str, str]]


def build_card_signature(card: CardLike) -> CardSignature:
    return CardSignature(
        stems=card_all_stems(card),
        stem_bigrams=card_all_stem_bigrams(card),
        char_ngrams=card_all_char_ngrams(card),
        keywords=card_all_keywords(card),
        word_bigrams=card_all_bigrams(card),
    )


def _contextual_score(
    sent_stems: set[str],
    sent_stem_bigrams: set[tuple[str, str]],
    sent_char_ngrams: set[str],
    sig: CardSignature,
) -> float:
    """Combine stem recall, stem-bigram overlap, and char n-gram recall into
    a single contextual similarity score in [0, 1].

    The intuition: we don't just check whether the same words appear, we
    check whether the same *concepts* (stems, prefix-aware so compound
    German words still hit), the same *relationships* (stem bigrams) and
    the same *morphology* (char n-grams that survive compounding). That's a
    much better proxy for "this card is about this part of the text" than
    literal word matching.
    """
    if not sig.stems:
        return 0.0
    stem_score, longest_match = _stem_recall(sent_stems, sig.stems)
    bigram_score = _bigram_overlap_score(sent_stem_bigrams, sig.stem_bigrams)
    char_score = _char_ngram_recall(sent_char_ngrams, sig.char_ngrams)
    # Weighted combination — stems carry the most signal, then phrase
    # context, then morphological similarity as a tiebreaker.
    score = 0.50 * stem_score + 0.25 * bigram_score + 0.25 * char_score
    # A strong stem bigram match is a near-certain hit. Bonus to push it
    # past the threshold even if other signals are weak.
    if bigram_score >= 0.5 and stem_score >= 0.15:
        score = max(score, 0.6)
    # Distinctive-concept bonus: if the card's longest stem (≥7 chars,
    # likely a domain-specific term or compound) gets a prefix-match in the
    # sentence, that single hit is strong evidence of topical overlap.
    if longest_match >= 7 and char_score >= 0.10:
        score = max(score, 0.45)
    # Strong morphological overlap is itself a meaningful signal even if
    # exact stems differ — char_score above ~0.30 means roughly a third of
    # the card's character n-grams reappear in the sentence.
    if char_score >= 0.30:
        score = max(score, 0.4 + 0.5 * char_score)
    return min(1.0, score)


MIN_BIGRAM_CONFIDENCE = 0.25  # legacy threshold (kept for compat)
MIN_KEYWORD_CONFIDENCE = 0.15  # legacy threshold (kept for compat)
MIN_CONTEXTUAL_CONFIDENCE = 0.45  # ≥45% combined contextual score


def match_card_to_sentences(
    sentences: list[Sentence],
    content: str,
    sections: list[Section],
    card: CardLike,
    *,
    sentence_keywords: list[set[str]] | None = None,
    sentence_bigrams: list[set[tuple[str, str]]] | None = None,
    sentence_stems: list[set[str]] | None = None,
    sentence_stem_bigrams: list[set[tuple[str, str]]] | None = None,
    sentence_char_ngrams: list[set[str]] | None = None,
    card_signature: CardSignature | None = None,
) -> list[SentenceMapping]:
    """Map a card to the sentences it covers using a multi-level strategy.

    Levels (tried in order, first success wins):
      1. Anchor range → overlapping sentences (perfect, user-pinned)
      2. Source excerpt / selected_text found in content → overlapping sentences
      3. Contextual similarity (stems + stem bigrams + char n-grams).
         This replaces the old single-level keyword Jaccard and is the
         "contextual instead of same-word" matcher: it understands
         morphological variants, compounds, and phrase relationships.

    The contextual matcher returns *every* sentence that scores above the
    threshold, not just the top one. That way a card about a multi-sentence
    explanation actually highlights every related sentence.
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

    # Level 3: Contextual similarity. Requires precomputed sentence features.
    sig = card_signature if card_signature is not None else build_card_signature(card)
    if (
        sig.stems
        and sentence_stems is not None
        and sentence_stem_bigrams is not None
        and sentence_char_ngrams is not None
    ):
        scored: list[tuple[int, float]] = []
        best_score = 0.0
        for i, sent in enumerate(sentences):
            if not sent.is_content:
                continue
            score = _contextual_score(
                sentence_stems[i],
                sentence_stem_bigrams[i],
                sentence_char_ngrams[i],
                sig,
            )
            if score >= MIN_CONTEXTUAL_CONFIDENCE:
                scored.append((i, score))
            if score > best_score:
                best_score = score
        if scored:
            # Keep matches that are within 25% of the best score so we
            # highlight every closely-related sentence, not just the peak.
            cutoff = max(MIN_CONTEXTUAL_CONFIDENCE, best_score * 0.75)
            for idx, score in scored:
                if score >= cutoff:
                    mappings.append(SentenceMapping(idx, card_id, score, "contextual"))
            if mappings:
                return mappings

    return []


# ---------------------------------------------------------------------------
# Coverage HTML (sentence-level highlighting)
# ---------------------------------------------------------------------------


def coverage_html(
    content: str, sentences: list[Sentence], sentence_cards: list[set[str]]
) -> str:
    """Render content with sentence-level coverage highlighting."""
    if not sentences:
        return '<pre class="coverage-text empty">No text available for coverage analysis.</pre>'

    parts: list[str] = ['<pre class="coverage-text">']
    cursor = 0

    for sent, card_ids in zip(sentences, sentence_cards, strict=False):
        # Add any gap between cursor and this sentence
        if cursor < sent.start:
            parts.append(html.escape(content[cursor : sent.start]))

        sent_html = html.escape(content[sent.start : sent.end])

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
            parts.append(
                f'<span class="coverage-token covered{multi_cls}{src_cls}" '
                f'data-card-ids="{ids}">{sent_html}</span>'
            )
        else:
            parts.append(f'<span class="coverage-token uncovered">{sent_html}</span>')

        cursor = sent.end

    if cursor < len(content):
        parts.append(html.escape(content[cursor:]))

    parts.append("</pre>")
    return "".join(parts)


# ---------------------------------------------------------------------------
# Gap detection
# ---------------------------------------------------------------------------


def _build_gap(
    content: str,
    sentences: list[Sentence],
    sections: list[Section],
    start_idx: int,
    end_idx: int,
) -> dict:
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


def find_gaps(
    content: str,
    sentences: list[Sentence],
    sentence_cards: list[set[str]],
    sections: list[Section],
) -> list[dict]:
    """Find runs of consecutive uncovered content sentences."""
    content_indices = [i for i, s in enumerate(sentences) if s.is_content]
    gaps: list[dict] = []
    run_start: int | None = None
    for ci in content_indices:
        if sentence_cards[ci]:
            if run_start is not None:
                gaps.append(
                    _build_gap(content, sentences, sections, run_start, prev_ci)
                )
                run_start = None
        else:
            if run_start is None:
                run_start = ci
            prev_ci = ci
    if run_start is not None:
        gaps.append(
            _build_gap(content, sentences, sections, run_start, content_indices[-1])
        )
    gaps.sort(key=lambda g: (-g["sentence_count"], g["start"]))
    return gaps[:12]


# ---------------------------------------------------------------------------
# Anki card filtering
# ---------------------------------------------------------------------------


def card_overlaps_note(
    content: str,
    note_kw: set[str],
    card: AnkiLibraryCard,
    *,
    note_stems: set[str] | None = None,
) -> bool:
    """Check whether an Anki library card is likely relevant to this note.

    Uses literal substring + keyword Jaccard for backward-compat callers,
    plus stem recall for the contextual matcher when note_stems is given.
    """
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
        if note_stems is not None:
            candidate_stems = extract_stems(candidate)
            stem_recall, _ = _stem_recall(note_stems, candidate_stems)
            if stem_recall >= 0.3:
                return True
    return False


# ---------------------------------------------------------------------------
# Public: best_excerpt_for_candidates  (used by AI module)
# ---------------------------------------------------------------------------


def best_excerpt_for_candidates(
    content: str, candidates: Iterable[str], *, limit: int = 220
) -> str:
    normalized = [plain_card_text(c) for c in candidates if plain_card_text(c)]
    if not content.strip():
        return ""
    for candidate in normalized:
        spans = _find_in_content(content, candidate)
        if spans:
            best = max(spans, key=lambda s: s[1] - s[0])
            text = normalize_space(content[best[0] : best[1]])
            return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"
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
            return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"
    text = normalize_space(content)
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


# ---------------------------------------------------------------------------
# Build card result (unchanged shape for API compat)
# ---------------------------------------------------------------------------


def _excerpt(text: str, limit: int = 120) -> str:
    text = normalize_space(text)
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def build_card_result(
    card: CardLike,
    *,
    mapped: bool,
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
                section_title_sec = (
                    section_for_offset(sections, first_sent.start) if sections else None
                )
                section_title = section_title_sec.title if section_title_sec else None

    back_text = plain_card_text(str(card_attr(card, "back", "")))

    payload: dict[str, Any] = {
        "id": str(card_attr(card, "id", "")),
        "type": str(card_attr(card, "type", "basic")),
        "origin": card_origin(card),
        "front": _excerpt(front_text, limit=120),
        "back": _excerpt(back_text, limit=100),
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
    mode: str = "auto",
) -> dict:
    content = note.content or ""
    sections = parse_sections(content)
    sentences = split_sentences(content)
    content_sentences = [s for s in sentences if s.is_content]

    # Pre-compute features for each sentence. Stems / stem-bigrams / char
    # n-grams power the new contextual matcher; the old keyword/bigram sets
    # stay around because some external callers (e.g. ai.py) still use them.
    sentence_keywords = [
        extract_keywords(s.text) if s.is_content else set() for s in sentences
    ]
    sentence_bigrams = [
        extract_bigrams(s.text) if s.is_content else set() for s in sentences
    ]
    sentence_stems = [
        extract_stems(s.text) if s.is_content else set() for s in sentences
    ]
    sentence_stem_bigrams = [
        extract_stem_bigrams(s.text) if s.is_content else set() for s in sentences
    ]
    sentence_char_ngrams = [
        extract_char_ngrams(s.text) if s.is_content else set() for s in sentences
    ]

    # Per-sentence card sets
    sentence_cards: list[set[str]] = [set() for _ in sentences]

    local_cards = list(note.cards)
    external_cards = list(external_cards or [])
    note_kw = extract_keywords(plain_card_text(content))
    note_stems = extract_stems(plain_card_text(content))
    external_candidates = [
        c
        for c in external_cards
        if card_overlaps_note(content, note_kw, c, note_stems=note_stems)
    ]

    card_results: list[dict[str, Any]] = []

    # Map local cards
    for card in local_cards:
        signature = build_card_signature(card)
        mappings = match_card_to_sentences(
            sentences,
            content,
            sections,
            card,
            sentence_keywords=sentence_keywords,
            sentence_bigrams=sentence_bigrams,
            sentence_stems=sentence_stems,
            sentence_stem_bigrams=sentence_stem_bigrams,
            sentence_char_ngrams=sentence_char_ngrams,
            card_signature=signature,
        )
        if not mappings:
            card_results.append(build_card_result(card, mapped=False))
            continue
        for m in mappings:
            sentence_cards[m.sentence_index].add(str(card.id))
        card_results.append(
            build_card_result(
                card,
                mapped=True,
                matched_sentences=mappings,
                content=content,
                sections=sections,
            )
        )

    # Map external (Anki) cards
    matched_external: list[dict[str, Any]] = []
    for card in external_candidates:
        signature = build_card_signature(card)
        mappings = match_card_to_sentences(
            sentences,
            content,
            sections,
            card,
            sentence_keywords=sentence_keywords,
            sentence_bigrams=sentence_bigrams,
            sentence_stems=sentence_stems,
            sentence_stem_bigrams=sentence_stem_bigrams,
            sentence_char_ngrams=sentence_char_ngrams,
            card_signature=signature,
        )
        if not mappings:
            continue
        for m in mappings:
            sentence_cards[m.sentence_index].add(f"anki:{card.id}")
        matched_external.append(
            build_card_result(
                card,
                mapped=True,
                matched_sentences=mappings,
                content=content,
                sections=sections,
            )
        )

    card_results.extend(matched_external)

    # Compute stats
    total_content = len(content_sentences)
    covered_content = sum(
        1 for i, s in enumerate(sentences) if s.is_content and sentence_cards[i]
    )
    coverage_pct = (
        round((covered_content / total_content) * 100, 1) if total_content else 0.0
    )

    # Section stats
    section_payloads: list[dict] = []
    uncovered_section_count = 0
    for sec in sections:
        sec_indices = [
            i
            for i, s in enumerate(sentences)
            if s.is_content and s.start < sec.end and s.end > sec.start
        ]
        total_sec = len(sec_indices)
        covered_sec = sum(1 for i in sec_indices if sentence_cards[i])
        sec_pct = round((covered_sec / total_sec) * 100, 1) if total_sec else 0.0
        sec_card_ids = sorted({cid for i in sec_indices for cid in sentence_cards[i]})
        if sec_pct < 100:
            uncovered_section_count += 1
        section_payloads.append(
            {
                "title": sec.title,
                "level": sec.level,
                "start": sec.start,
                "end": sec.end,
                "total_words": total_sec,  # re-using field name for compat
                "covered_words": covered_sec,  # re-using field name for compat
                "coverage_percent": sec_pct,
                "card_ids": sec_card_ids,
            }
        )

    # Gaps
    gaps = find_gaps(content, sentences, sentence_cards, sections)

    local_mapped = sum(
        1 for r in card_results if r["origin"] == "local" and r["mapped"]
    )
    local_unmapped = len(local_cards) - local_mapped
    anki_matched = len(matched_external)

    payload_anki = {
        "available": bool(anki_status.get("available", False))
        if anki_status
        else False,
        "error": anki_status.get("error") if anki_status else None,
        "total_cards": len(external_cards),
        "considered_cards": len(external_candidates),
        "matched_cards": anki_matched,
    }

    return {
        "stats": {
            "covered_words": covered_content,  # field name kept for compat
            "total_words": total_content,  # field name kept for compat
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
