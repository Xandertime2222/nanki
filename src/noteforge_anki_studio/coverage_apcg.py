"""APCG Coverage Algorithm v2 - With Specialized Modes.

Implements the APCG algorithm with 4 specialized modes:
1. FACTS - History, Geography, Events (dates, names, places)
2. PROCESS - Biology, Medicine, Chemistry (causal relationships)
3. DEFINITION - Vocabulary, Concepts, Theories (definitions, synonyms)
4. UNIVERSAL - Mixed content (balanced approach)

Also considers front/back card relationships for better matching.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal
from enum import Enum


# ---------------------------------------------------------------------------
# Enums & Types
# ---------------------------------------------------------------------------


class CoverageMode(Enum):
    """Coverage algorithm modes."""
    FACTS = "facts"
    PROCESS = "process"
    DEFINITION = "definition"
    UNIVERSAL = "universal"
    AUTO = "auto"


CoverageModeStr = Literal["facts", "process", "definition", "universal", "auto"]


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------


@dataclass
class Proposition:
    """Atomic claim extracted from text."""
    id: str
    text: str
    source_span: tuple[int, int]
    slots: dict[str, str] = field(default_factory=dict)
    core_slots: list[str] = field(default_factory=list)
    critical_slots: list[str] = field(default_factory=list)
    mass: float = 1.0
    span_id: str = ""
    proposition_type: str = "general"  # facts, process, definition


@dataclass
class Evidence:
    """Evidence extracted from a flashcard."""
    id: str
    card_id: str
    front_text: str = ""
    back_text: str = ""
    extra_text: str = ""
    front_slots: dict[str, str] = field(default_factory=dict)
    back_slots: dict[str, str] = field(default_factory=dict)
    combined_slots: dict[str, str] = field(default_factory=dict)
    source: str = "card"
    card_type: str = "general"  # question_answer, fact, definition


@dataclass
class SlotMatch:
    """Result of matching a slot between proposition and evidence."""
    slot_name: str
    matched: bool
    confidence: float = 0.0
    evidence_value: str = ""
    proposition_value: str = ""


@dataclass
class PropositionCoverage:
    """Coverage analysis result for a single proposition."""
    proposition: Proposition
    core_score: float = 0.0
    all_score: float = 0.0
    compliance_score: float = 0.0
    exact_score: float = 0.0
    conflict_score: float = 0.0
    matched_evidence: list[Evidence] = field(default_factory=list)
    uncovered_slots: list[str] = field(default_factory=list)
    conflicting_evidence: list[tuple[Evidence, float]] = field(default_factory=list)
    front_back_match: bool = False
    match_method: str = ""


@dataclass
class CoverageResult:
    """Full coverage analysis result."""
    propositions: list[PropositionCoverage]
    span_scores: dict[str, dict[str, float]] = field(default_factory=dict)
    total_core: float = 0.0
    total_exact: float = 0.0
    uncovered_propositions: list[Proposition] = field(default_factory=list)
    conflicting_cards: list[tuple[str, float]] = field(default_factory=list)
    evidence_map: dict[str, list[str]] = field(default_factory=dict)
    detected_mode: str = ""


@dataclass
class CoverageConfig:
    """Configuration for coverage analysis."""
    mode: CoverageMode = CoverageMode.UNIVERSAL
    min_confidence: float = 0.3
    language: str = "auto"  # "de", "en", "auto"
    consider_front_back: bool = True
    auto_detect: bool = True


# ---------------------------------------------------------------------------
# Stop Words (DE + EN)
# ---------------------------------------------------------------------------


STOP_WORDS = frozenset({
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
    "damit", "dazu", "jedoch", "sowie", "wurden", "wurde", "können", "soll",
    "sollen", "muss", "müssen", "darf", "dürfen", "es", "er", "sie", "wir",
    "ihr", "mein", "dein", "sein", "unser", "euer",
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
    "while", "it", "he", "she", "we", "me", "us", "them", "my", "your",
})


# ---------------------------------------------------------------------------
# Mode-Specific Patterns
# ---------------------------------------------------------------------------


FACTS_PATTERNS = {
    # Year/event patterns
    "year_event": re.compile(r"\b(1\d{3}|2\d{3})\b"),
    "born_died": re.compile(r"(?:geboren|gestorben|born|died)\s+(?:am|im)?\s*(\d{1,2}\.\s*\w+\s*\d{4}|\d{4})"),
    "battle_at": re.compile(r"(?:Schlacht|Battle)\s+(?:bei|at|of)\s+([A-Z][\w\s]+)"),
    "founded": re.compile(r"(?:gegründet|founded)\s+(?:im Jahr|in)\s*(\d{4})"),
    "capital": re.compile(r"(?:Hauptstadt|capital)\s+(?:von|of)\s+([A-Z][\w\s]+)"),
}

PROCESS_PATTERNS = {
    # Causal relationship patterns
    "produces": re.compile(r"(?:produziert|produces|stellt her)\s+(.+?)(?:\.|$)"),
    "converts": re.compile(r"(?:wandelt um|konvertiert|converts)\s+(.+?)\s+(?:in|into)\s+(.+?)(?:\.|$)"),
    "causes": re.compile(r"(?:verursacht|causes|führt zu)\s+(.+?)(?:\.|$)"),
    "located_in": re.compile(r"(?:befindet sich|liegt|is located|occurs)\s+(?:in|at|auf)\s+(.+?)(?:\.|$)"),
    "transport": re.compile(r"(?:transportiert|transports|pumpt|pumps)\s+(.+?)(?:\.|$)"),
    "enzyme": re.compile(r"(?:Enzym|enzyme|Katalysator|catalyst)\s+(?:für|for)\s+(.+?)(?:\.|$)"),
}

DEFINITION_PATTERNS = {
    # Definition patterns
    "is_a": re.compile(r"^(.+?)\s+(?:ist|sind|is|are)\s+(?:ein|eine|a|an)\s+(.+?)(?:\.|$)"),
    "means": re.compile(r"^(.+?)\s+(?:bedeutet|means|heißt)\s+(.+?)(?:\.|$)"),
    "called": re.compile(r"^(.+?)\s+(?:wird genannt|is called|heißt)\s+(.+?)(?:\.|$)"),
    "defined_as": re.compile(r"^(?:Unter|Under)\s+(.+?)\s+(?:versteht man|refers to)\s+(.+?)(?:\.|$)"),
}


# ---------------------------------------------------------------------------
# Text Helpers
# ---------------------------------------------------------------------------


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def has_alpha(text: str) -> bool:
    return any(c.isalpha() for c in (text or ""))


# ---------------------------------------------------------------------------
# Discourse Segmentation
# ---------------------------------------------------------------------------


SENTENCE_BOUNDARY = re.compile(r"([.!?])\s+(?=[A-ZÄÖÜÉÈÊ0-9(\"„«\[])", re.UNICODE)
PARAGRAPH_BREAK = re.compile(r"\n\s*\n")
ABBREVIATIONS = frozenset({
    "z", "etc", "dr", "nr", "abb", "kap", "vgl", "ca", "mr", "ms", "vs",
    "prof", "bzw", "bsp", "inkl", "ggf", "evtl", "usw", "sog",
})


def _is_abbreviation(text: str, dot_pos: int) -> bool:
    """Check if period at dot_pos is part of an abbreviation."""
    i = dot_pos - 1
    while i >= 0 and text[i].isalpha():
        i -= 1
    word = text[i + 1:dot_pos].lower()
    if word in ABBREVIATIONS:
        return True
    if len(word) <= 1 and word.isalpha():
        return True
    return False


def discourse_segment(text: str) -> list[tuple[int, int, str]]:
    """Split text into discourse segments (sentences with positions)."""
    if not text.strip():
        return []
    
    # Remove markdown headings from content for analysis
    clean_text = re.sub(r'^#{1,6}\s+.*$', '', text, flags=re.MULTILINE)
    clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
    
    segments: list[tuple[int, int, str]] = []
    boundaries: list[int] = []
    
    # Find sentence boundaries
    for m in SENTENCE_BOUNDARY.finditer(clean_text):
        punct_pos = m.start()
        if m.group(1) == "." and _is_abbreviation(clean_text, punct_pos):
            continue
        boundaries.append(punct_pos + 1)
    
    # Build segments
    starts = [0] + boundaries
    ends = boundaries + [len(clean_text)]
    
    for s, e in zip(starts, ends, strict=False):
        chunk = clean_text[s:e].strip()
        # Skip empty chunks and very short ones (less than 4 chars)
        if chunk and len(chunk) >= 4:
            # Find actual position in original text
            orig_start = text.find(chunk, max(0, s - 50))
            if orig_start >= 0:
                orig_end = orig_start + len(chunk)
                segments.append((orig_start, orig_end, chunk))
            else:
                segments.append((s, e, chunk))
    
    return segments


# ---------------------------------------------------------------------------
# Auto-Detection of Text Type
# ---------------------------------------------------------------------------


def detect_text_type(text: str) -> CoverageMode:
    """Automatically detect the best coverage mode for given text."""
    text_lower = text.lower()
    
    # Count indicators for each type
    facts_score = 0
    process_score = 0
    definition_score = 0
    
    # FACTS indicators
    year_matches = re.findall(r'\b(1\d{3}|2\d{3})\b', text)
    facts_score += len(year_matches) * 2
    
    facts_keywords = ["krieg", "schlacht", "geboren", "gestorben", "jahr", "datum",
                      "war", "battle", "born", "died", "year", "founded", "capital"]
    for kw in facts_keywords:
        if kw in text_lower:
            facts_score += 1
    
    # PROCESS indicators
    process_keywords = ["produziert", "wandelt", "verursacht", "befindet sich",
                        "pumpt", "transportiert", "enzyme", "produces", "converts",
                        "causes", "located", "occurs", "transports", "process"]
    for kw in process_keywords:
        if kw in text_lower:
            process_score += 2
    
    process_patterns = ["wird.*produziert", "wandelt.*um", "führt zu", "besteht aus"]
    for pattern in process_patterns:
        if re.search(pattern, text_lower):
            process_score += 2
    
    # DEFINITION indicators
    definition_keywords = ["ist ein", "ist eine", "sind", "bedeutet", "heißt",
                           "is a", "is an", "are", "means", "called", "refers to"]
    for kw in definition_keywords:
        if kw in text_lower:
            definition_score += 1
    
    # Determine winner
    scores = {
        CoverageMode.FACTS: facts_score,
        CoverageMode.PROCESS: process_score,
        CoverageMode.DEFINITION: definition_score,
    }
    
    max_score = max(scores.values())
    
    # If all scores are low, use UNIVERSAL
    if max_score < 3:
        return CoverageMode.UNIVERSAL
    
    # Return mode with highest score
    for mode, score in scores.items():
        if score == max_score:
            return mode
    
    return CoverageMode.UNIVERSAL


# ---------------------------------------------------------------------------
# Semantic Parsing → Propositions (Mode-Aware)
# ---------------------------------------------------------------------------


def _extract_slots_facts(text: str) -> dict[str, str]:
    """Extract slots for FACTS mode."""
    slots = {}
    
    # Year extraction
    year_match = re.search(r'\b(1\d{3}|2\d{3})\b', text)
    if year_match:
        slots["year"] = year_match.group(1)
    
    # Date extraction
    date_match = re.search(r'(\d{1,2}\.\s*\w+\s*\d{4})', text)
    if date_match:
        slots["date"] = date_match.group(1)
    
    # Location extraction (capitalized words after prepositions)
    loc_match = re.search(r'(?:bei|in|an|auf|vor|at|near)\s+([A-Z][\w\s]+?)(?:\.|,|$)', text)
    if loc_match:
        slots["location"] = loc_match.group(1).strip()
    
    # Person names (capitalized sequences)
    person_match = re.search(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
    if person_match:
        slots["person"] = person_match.group(1)
    
    # Event names
    event_match = re.search(r'(?:Schlacht|Battle|Krieg|War)\s+(?:bei|at|of)?\s*([A-Z][\w\s]+?)(?:\.|,|$)', text)
    if event_match:
        slots["event"] = event_match.group(1).strip()
    
    return slots


def _extract_slots_process(text: str) -> dict[str, str]:
    """Extract slots for PROCESS mode."""
    slots = {}
    
    # Produces/creates
    prod_match = re.search(r'(.+?)\s+(?:produziert|produces|stellt her|erzeugt)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if prod_match:
        slots["producer"] = prod_match.group(1).strip()
        slots["product"] = prod_match.group(2).strip()
    
    # Converts/transforms
    conv_match = re.search(r'(.+?)\s+(?:wandelt um|konvertiert|converts|transformiert)\s+(.+?)\s+(?:in|into)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if conv_match:
        slots["converter"] = conv_match.group(1).strip()
        slots["input"] = conv_match.group(2).strip()
        slots["output"] = conv_match.group(3).strip()
    
    # Location
    loc_match = re.search(r'(.+?)\s+(?:befindet sich|liegt|occurs|is located|takes place)\s+(?:in|at|auf)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if loc_match:
        slots["entity"] = loc_match.group(1).strip()
        slots["location"] = loc_match.group(2).strip()
    
    # Transport/pump
    trans_match = re.search(r'(.+?)\s+(?:pumpt|transportiert|transports|leitet)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if trans_match:
        slots["transporter"] = trans_match.group(1).strip()
        slots["transported"] = trans_match.group(2).strip()
    
    # Causes
    cause_match = re.search(r'(.+?)\s+(?:verursacht|causes|führt zu|löst aus)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if cause_match:
        slots["cause"] = cause_match.group(1).strip()
        slots["effect"] = cause_match.group(2).strip()
    
    # Quantities
    qty_match = re.search(r'(\d+(?:\.\d+)?)\s*(mg|g|kg|ml|l|m|km|°C|mol|Hz|nm)', text, re.IGNORECASE)
    if qty_match:
        slots["quantity"] = f"{qty_match.group(1)} {qty_match.group(2)}"
    
    return slots


def _extract_slots_definition(text: str) -> dict[str, str]:
    """Extract slots for DEFINITION mode."""
    slots = {}
    
    # "X ist ein/eine Y"
    is_a_match = re.search(r'^(.+?)\s+(?:ist|sind|is|are)\s+(?:ein|eine|a|an)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if is_a_match:
        slots["term"] = is_a_match.group(1).strip()
        slots["category"] = is_a_match.group(2).strip()
    
    # "X bedeutet Y"
    means_match = re.search(r'^(.+?)\s+(?:bedeutet|means|heißt)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if means_match:
        slots["term"] = means_match.group(1).strip()
        slots["definition"] = means_match.group(2).strip()
    
    # "X wird Y genannt"
    called_match = re.search(r'^(.+?)\s+(?:wird genannt|is called|heißt)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if called_match:
        slots["entity"] = called_match.group(1).strip()
        slots["name"] = called_match.group(2).strip()
    
    # "Unter X versteht man Y"
    understands_match = re.search(r'(?:Unter|Under)\s+(.+?)\s+(?:versteht man|refers to)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
    if understands_match:
        slots["term"] = understands_match.group(1).strip()
        slots["definition"] = understands_match.group(2).strip()
    
    # General "X ist Y" fallback
    if not slots:
        general_match = re.search(r'(.+?)\s+(?:ist|is)\s+(.+?)(?:\.|$)', text, re.IGNORECASE)
        if general_match:
            slots["subject"] = general_match.group(1).strip()
            slots["predicate"] = general_match.group(2).strip()
    
    return slots


def _extract_slots_universal(text: str) -> dict[str, str]:
    """Extract slots using all patterns (UNIVERSAL mode)."""
    slots = {}
    slots.update(_extract_slots_facts(text))
    slots.update(_extract_slots_process(text))
    slots.update(_extract_slots_definition(text))
    return slots


def _identify_core_slots(slots: dict[str, str], mode: CoverageMode) -> list[str]:
    """Identify core slots based on mode."""
    if mode == CoverageMode.FACTS:
        return [k for k in ["year", "event", "person", "location"] if k in slots] or list(slots.keys())[:2]
    elif mode == CoverageMode.PROCESS:
        return [k for k in ["cause", "effect", "product", "location"] if k in slots] or list(slots.keys())[:2]
    elif mode == CoverageMode.DEFINITION:
        return [k for k in ["term", "definition", "category"] if k in slots] or list(slots.keys())[:2]
    else:  # UNIVERSAL
        return list(slots.keys())[:3]


def _identify_critical_slots(slots: dict[str, str], mode: CoverageMode) -> list[str]:
    """Identify critical slots based on mode."""
    if mode == CoverageMode.FACTS:
        return [k for k in ["year", "event", "person"] if k in slots] or list(slots.keys())[:1]
    elif mode == CoverageMode.PROCESS:
        return [k for k in ["product", "cause", "location"] if k in slots] or list(slots.keys())[:1]
    elif mode == CoverageMode.DEFINITION:
        return [k for k in ["term", "category"] if k in slots] or list(slots.keys())[:1]
    else:  # UNIVERSAL
        return list(slots.keys())[:1]


def _determine_proposition_type(slots: dict[str, str]) -> str:
    """Determine proposition type from extracted slots."""
    if "year" in slots or "date" in slots or "event" in slots:
        return "facts"
    if "cause" in slots or "effect" in slots or "product" in slots or "location" in slots:
        return "process"
    if "term" in slots or "definition" in slots or "category" in slots:
        return "definition"
    return "general"


def semantic_parse(
    segment: tuple[int, int, str],
    prop_id: str,
    mode: CoverageMode = CoverageMode.UNIVERSAL,
) -> Proposition:
    """Parse a discourse segment into a proposition with slots."""
    start, end, text = segment
    
    # Extract slots based on mode
    if mode == CoverageMode.FACTS:
        slots = _extract_slots_facts(text)
    elif mode == CoverageMode.PROCESS:
        slots = _extract_slots_process(text)
    elif mode == CoverageMode.DEFINITION:
        slots = _extract_slots_definition(text)
    else:
        slots = _extract_slots_universal(text)
    
    # If no structured slots found, use simple extraction
    if not slots:
        words = text.split()
        if len(words) >= 3:
            slots["subject"] = " ".join(words[:2])
            slots["predicate"] = " ".join(words[2:])
    
    core_slots = _identify_core_slots(slots, mode)
    critical_slots = _identify_critical_slots(slots, mode)
    prop_type = _determine_proposition_type(slots)
    
    # Calculate mass based on information density
    mass = min(2.0, 0.5 + len(slots) * 0.3 + len(text) / 100)
    
    return Proposition(
        id=prop_id,
        text=text,
        source_span=(start, end),
        slots=slots,
        core_slots=core_slots,
        critical_slots=critical_slots,
        mass=mass,
        span_id=f"span_{prop_id}",
        proposition_type=prop_type,
    )


def atomicize(proposition: Proposition) -> list[Proposition]:
    """Break proposition into atomic claims (if needed)."""
    return [proposition]


# ---------------------------------------------------------------------------
# Evidence Extraction from Cards (Front/Back Aware)
# ---------------------------------------------------------------------------


def _extract_front_back_relationship(front: str, back: str) -> dict[str, Any]:
    """Analyze the relationship between front and back of a card."""
    relationship = {
        "is_question_answer": False,
        "is_cloze": False,
        "is_definition": False,
        "shared_concepts": [],
        "back_adds_info": False,
    }
    
    front_lower = front.lower()
    back_lower = back.lower()
    
    # Check if front is a question
    question_words = ["was", "wie", "wo", "wann", "warum", "wer", "wen", "wem", "wessen",
                      "what", "how", "where", "when", "why", "who", "which"]
    if front_lower.startswith(tuple(question_words)) or front.endswith("?"):
        relationship["is_question_answer"] = True
    
    # Check for cloze deletion
    if "{{c" in front or "{{c" in back:
        relationship["is_cloze"] = True
    
    # Check for definition pattern
    if re.search(r'(?:ist|sind|is|are)\s+(?:ein|eine|a|an)', back_lower):
        relationship["is_definition"] = True
    
    # Find shared concepts (keywords in both front and back)
    front_words = set(re.findall(r'\b\w{4,}\b', front_lower))
    back_words = set(re.findall(r'\b\w{4,}\b', back_lower))
    shared = front_words & back_words
    relationship["shared_concepts"] = list(shared)
    
    # Check if back adds significant new information
    back_unique_words = back_words - front_words
    if len(back_unique_words) >= 3:
        relationship["back_adds_info"] = True
    
    return relationship


def parse_question_answer_into_evidence(
    card_id: str,
    front: str,
    back: str,
    extra: str = "",
    source_excerpt: str = "",
    mode: CoverageMode = CoverageMode.UNIVERSAL,
) -> list[Evidence]:
    """Extract evidence from flashcard Q&A with front/back awareness."""
    evidences = []
    
    # Analyze front/back relationship
    fb_relationship = _extract_front_back_relationship(front, back)
    
    # Determine card type
    card_type = "general"
    if fb_relationship["is_question_answer"]:
        card_type = "question_answer"
    elif fb_relationship["is_cloze"]:
        card_type = "cloze"
    elif fb_relationship["is_definition"]:
        card_type = "definition"
    
    # Extract slots from front
    front_slots = {}
    if front and len(front.strip()) >= 5:
        if mode == CoverageMode.FACTS:
            front_slots = _extract_slots_facts(front)
        elif mode == CoverageMode.PROCESS:
            front_slots = _extract_slots_process(front)
        elif mode == CoverageMode.DEFINITION:
            front_slots = _extract_slots_definition(front)
        else:
            front_slots = _extract_slots_universal(front)
    
    # Extract slots from back (PRIMARY evidence source)
    back_slots = {}
    if back and len(back.strip()) >= 5:
        if mode == CoverageMode.FACTS:
            back_slots = _extract_slots_facts(back)
        elif mode == CoverageMode.PROCESS:
            back_slots = _extract_slots_process(back)
        elif mode == CoverageMode.DEFINITION:
            back_slots = _extract_slots_definition(back)
        else:
            back_slots = _extract_slots_universal(back)
    
    # Priority 1: Back side as primary evidence (contains the facts)
    if back_slots:
        evidences.append(Evidence(
            id=f"evidence_{card_id}_back",
            card_id=card_id,
            front_text=front[:200],
            back_text=back[:200],
            back_slots=back_slots,
            front_slots=front_slots,
            combined_slots={**front_slots, **back_slots},
            source="back",
            card_type=card_type,
        ))
    
    # Priority 2: Combined front+back for context
    if front and back:
        combined_text = f"{front} {back}"
        combined_slots = {}
        if mode == CoverageMode.FACTS:
            combined_slots = _extract_slots_facts(combined_text)
        elif mode == CoverageMode.PROCESS:
            combined_slots = _extract_slots_process(combined_text)
        elif mode == CoverageMode.DEFINITION:
            combined_slots = _extract_slots_definition(combined_text)
        else:
            combined_slots = _extract_slots_universal(combined_text)
        
        # Only add if we get additional slots
        if combined_slots and (not back_slots or len(combined_slots) > len(back_slots)):
            evidences.append(Evidence(
                id=f"evidence_{card_id}_combined",
                card_id=card_id,
                front_text=front[:200],
                back_text=back[:200],
                front_slots=front_slots,
                back_slots=back_slots,
                combined_slots=combined_slots,
                source="combined",
                card_type=card_type,
            ))
    
    # Priority 3: Front-only for topic identification
    if front_slots and not any(e.front_slots for e in evidences):
        evidences.append(Evidence(
            id=f"evidence_{card_id}_front",
            card_id=card_id,
            front_text=front[:100],
            back_text="",
            front_slots=front_slots,
            source="front",
            card_type=card_type,
        ))
    
    # Priority 4: Extra information
    if extra and len(extra.strip()) >= 10:
        extra_slots = _extract_slots_universal(extra)  # Always use universal for extra
        if extra_slots:
            evidences.append(Evidence(
                id=f"evidence_{card_id}_extra",
                card_id=card_id,
                front_text=front[:100],
                back_text=back[:100],
                extra_text=extra[:100],
                combined_slots=extra_slots,
                source="extra",
                card_type=card_type,
            ))
    
    # Priority 5: Source excerpt matching (HIGHEST PRIORITY for accurate coverage)
    if source_excerpt and len(source_excerpt.strip()) >= 5:
        excerpt_slots = _extract_slots_universal(source_excerpt)
        # Fallback: Use simple extraction if no slots found
        if not excerpt_slots:
            words = source_excerpt.split()
            if len(words) >= 3:
                excerpt_slots = {
                    "subject": " ".join(words[:2]),
                    "predicate": " ".join(words[2:]),
                }
        # Create evidence even if slots are empty (for text matching)
        evidences.append(Evidence(
            id=f"evidence_{card_id}_excerpt",
            card_id=card_id,
            front_text=front[:100],
            back_text=back[:100],
            extra_text=source_excerpt[:200],
            combined_slots=excerpt_slots,
            source="excerpt",
            card_type=card_type,
        ))
    
    return evidences


# ---------------------------------------------------------------------------
# Glossary & Canonicalization
# ---------------------------------------------------------------------------


def build_local_concept_glossary(
    propositions: list[Proposition],
    evidence_list: list[Evidence],
) -> dict[str, str]:
    """Build a glossary mapping variant terms to canonical forms."""
    glossary: dict[str, str] = {}
    
    # Collect all slot values
    all_values: list[str] = []
    for prop in propositions:
        all_values.extend(prop.slots.values())
    for ev in evidence_list:
        for slot_dict in [ev.front_slots, ev.back_slots, ev.combined_slots]:
            all_values.extend(slot_dict.values())
    
    # Simple canonicalization: lowercase, strip
    for value in all_values:
        if value and len(value) >= 3:
            canonical = value.lower().strip()
            glossary[value.lower()] = canonical
    
    # Add common variants
    variants = {
        "ist": "sein", "sind": "sein", "war": "sein", "waren": "sein",
        "hat": "haben", "haben": "haben", "hatte": "haben",
        "is": "be", "are": "be", "was": "be", "were": "be",
        "produziert": "produzieren", "produces": "produce",
        "wandelt um": "umwandeln", "converts": "convert",
    }
    glossary.update(variants)
    
    return glossary


def canonicalize_slots(slots: dict[str, str], glossary: dict[str, str]) -> dict[str, str]:
    """Canonicalize slot values using glossary."""
    canonical = {}
    for key, value in slots.items():
        if value:
            canonical[key] = glossary.get(value.lower(), value.lower().strip())
        else:
            canonical[key] = ""
    return canonical


def canonicalize(
    propositions: list[Proposition],
    evidence_list: list[Evidence],
    glossary: dict[str, str],
) -> tuple[list[Proposition], list[Evidence]]:
    """Canonicalize all propositions and evidence using glossary."""
    for prop in propositions:
        prop.slots = canonicalize_slots(prop.slots, glossary)
    
    for ev in evidence_list:
        ev.front_slots = canonicalize_slots(ev.front_slots, glossary)
        ev.back_slots = canonicalize_slots(ev.back_slots, glossary)
        ev.combined_slots = canonicalize_slots(ev.combined_slots, glossary)
    
    return propositions, evidence_list


def deduplicate_near_identical_cards(evidence_list: list[Evidence]) -> list[Evidence]:
    """Remove near-duplicate evidence entries."""
    seen_signatures: set[str] = set()
    unique: list[Evidence] = []
    
    for ev in evidence_list:
        # Create signature from card_id and source
        signature = f"{ev.card_id}:{ev.source}"
        if signature not in seen_signatures:
            seen_signatures.add(signature)
            unique.append(ev)
    
    return unique


# ---------------------------------------------------------------------------
# Retrieval & Matching
# ---------------------------------------------------------------------------


def build_retrieval_index(evidence_list: list[Evidence]) -> dict[str, list[Evidence]]:
    """Build inverted index for evidence retrieval."""
    index: dict[str, list[Evidence]] = {}
    
    for ev in evidence_list:
        # Index by all slot sources
        for slot_dict in [ev.front_slots, ev.back_slots, ev.combined_slots]:
            for slot_name, slot_value in slot_dict.items():
                if not slot_value:
                    continue
                
                # Index by slot name + value
                key = f"{slot_name}:{slot_value}"
                if key not in index:
                    index[key] = []
                index[key].append(ev)
                
                # Index by individual words
                words = slot_value.split()
                for word in words:
                    if len(word) >= 3:
                        if word not in index:
                            index[word] = []
                        index[word].append(ev)
        
        # Index by card type
        if ev.card_type != "general":
            if ev.card_type not in index:
                index[ev.card_type] = []
            index[ev.card_type].append(ev)
    
    return index


def retrieve_top_k(
    index: dict[str, list[Evidence]],
    proposition: Proposition,
    k: int = 5,
) -> list[Evidence]:
    """Retrieve top-k evidence candidates for a proposition."""
    candidates: dict[str, Evidence] = {}
    scores: dict[str, float] = {}
    
    for slot_name, slot_value in proposition.slots.items():
        if not slot_value:
            continue
        
        # Exact slot match
        key = f"{slot_name}:{slot_value}"
        if key in index:
            for ev in index[key]:
                if ev.card_id not in candidates:
                    candidates[ev.card_id] = ev
                    scores[ev.card_id] = 2.0
                else:
                    scores[ev.card_id] += 2.0
        
        # Word-level match
        words = slot_value.split()
        for word in words:
            if len(word) >= 3 and word in index:
                for ev in index[word]:
                    if ev.card_id not in candidates:
                        candidates[ev.card_id] = ev
                        scores[ev.card_id] = 1.0
                    else:
                        scores[ev.card_id] += 0.5
    
    # Sort by score and return top-k
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return [candidates[cid] for cid in sorted_ids[:k]]


# ---------------------------------------------------------------------------
# Slot Matching (Mode-Aware)
# ---------------------------------------------------------------------------


def slot_match(
    evidence: Evidence,
    proposition: Proposition,
    slot_name: str,
    mode: CoverageMode = CoverageMode.UNIVERSAL,
) -> float:
    """Calculate match score for a specific slot."""
    # Try to get slot value from best source
    ev_value = evidence.back_slots.get(slot_name, "")
    if not ev_value:
        ev_value = evidence.combined_slots.get(slot_name, "")
    if not ev_value:
        ev_value = evidence.front_slots.get(slot_name, "")
    
    prop_value = proposition.slots.get(slot_name, "")
    
    if not prop_value or not ev_value:
        return 0.0
    
    # Exact match
    if ev_value.lower() == prop_value.lower():
        return 1.0
    
    # Substring match (case-insensitive)
    ev_lower = ev_value.lower()
    prop_lower = prop_value.lower()
    
    if prop_lower in ev_lower or ev_lower in prop_lower:
        overlap_len = min(len(ev_lower), len(prop_lower))
        return 0.7 + 0.3 * (overlap_len / max(len(ev_lower), len(prop_lower)))
    
    # Word overlap (Jaccard-style)
    ev_words = set(ev_lower.split())
    prop_words = set(prop_lower.split())
    
    # Filter stop words
    stop_words = {"der", "die", "das", "ein", "eine", "ist", "sind", "war", "hat", "haben", 
                  "wird", "werden", "the", "a", "an", "is", "are", "es", "er", "sie"}
    ev_words_filtered = {w for w in ev_words if len(w) > 2 and w not in stop_words}
    prop_words_filtered = {w for w in prop_words if len(w) > 2 and w not in stop_words}
    
    if not prop_words_filtered:
        return 0.0
    
    overlap = len(ev_words_filtered & prop_words_filtered)
    return overlap / len(prop_words_filtered)


def text_overlap_score(evidence: Evidence, proposition: Proposition) -> float:
    """Calculate keyword overlap between full texts."""
    stop_words = {"der", "die", "das", "ein", "eine", "ist", "sind", "war", "hat", "haben",
                  "wird", "werden", "the", "a", "an", "is", "are", "es", "er", "sie"}
    
    # Use back text as primary (contains answers)
    ev_text = evidence.back_text if evidence.back_text else evidence.front_text
    prop_text = proposition.text
    
    ev_words = set(ev_text.lower().split())
    prop_words = set(prop_text.lower().split())
    
    ev_filtered = {w for w in ev_words if len(w) > 2 and w not in stop_words}
    prop_filtered = {w for w in prop_words if len(w) > 2 and w not in stop_words}
    
    if not prop_filtered:
        return 0.0
    
    overlap = len(ev_filtered & prop_filtered)
    return overlap / len(prop_filtered)


def front_back_coherence_score(evidence: Evidence, proposition: Proposition) -> float:
    """Check if front/back relationship matches proposition structure."""
    # If proposition is a fact and card is Q&A with good back coverage
    if evidence.card_type == "question_answer":
        # Check if back covers the proposition well
        back_overlap = text_overlap_score(
            Evidence(id="", card_id="", back_text=evidence.back_text, back_slots=evidence.back_slots),
            proposition
        )
        # Check if front relates to proposition topic
        front_overlap = text_overlap_score(
            Evidence(id="", card_id="", front_text=evidence.front_text, front_slots=evidence.front_slots),
            proposition
        )
        
        # Good coherence if back covers proposition and front asks about it
        if back_overlap > 0.3 and front_overlap > 0.1:
            return 0.8
    
    return 0.0


def novelty_factor(
    evidence: Evidence,
    proposition: Proposition,
    slot_name: str,
) -> float:
    """Calculate novelty factor (how much new info evidence adds)."""
    ev_value = evidence.back_slots.get(slot_name, "")
    if not ev_value:
        ev_value = evidence.combined_slots.get(slot_name, "")
    prop_value = proposition.slots.get(slot_name, "")
    
    if not prop_value or not ev_value:
        return 0.0
    
    ev_lower = ev_value.lower()
    prop_lower = prop_value.lower()
    
    # If evidence has more specific/detailed value
    if len(ev_lower) > len(prop_lower) * 1.2:
        return 0.4
    
    # If evidence provides same info (confirmation)
    if ev_lower == prop_lower:
        return 0.5
    
    # Partial match
    if prop_lower in ev_lower or ev_lower in prop_lower:
        return 0.4
    
    # Some word overlap
    ev_words = set(ev_lower.split())
    prop_words = set(prop_lower.split())
    overlap = len(ev_words & prop_words)
    
    if overlap > 0:
        return 0.3
    
    return 0.1


def hard_contradiction(evidence: Evidence, proposition: Proposition) -> bool:
    """Check for hard contradictions."""
    # Check for conflicting years
    ev_year = evidence.back_slots.get("year", evidence.combined_slots.get("year", ""))
    prop_year = proposition.slots.get("year", "")
    
    if ev_year and prop_year and ev_year != prop_year:
        return True
    
    # Check for conflicting quantities
    ev_qty = evidence.back_slots.get("quantity", evidence.combined_slots.get("quantity", ""))
    prop_qty = proposition.slots.get("quantity", "")
    
    if ev_qty and prop_qty and ev_qty != prop_qty:
        return True
    
    return False


def contradiction_score(evidence: Evidence, proposition: Proposition) -> float:
    """Calculate contradiction severity."""
    if not hard_contradiction(evidence, proposition):
        return 0.0
    
    conflicts = 0
    for slot_name in ["year", "quantity", "percentage"]:
        ev_val = evidence.back_slots.get(slot_name, evidence.combined_slots.get(slot_name, ""))
        prop_val = proposition.slots.get(slot_name, "")
        if ev_val and prop_val and ev_val != prop_val:
            conflicts += 1
    
    return min(1.0, conflicts * 0.5)


def soft_conflict_score(evidence: Evidence, proposition: Proposition) -> float:
    """Calculate soft conflict (partial disagreement)."""
    ev_text = (evidence.back_text or evidence.front_text).lower()
    prop_text = proposition.text.lower()
    
    ev_words = set(ev_text.split())
    prop_words = set(prop_text.split())
    
    if not ev_words or not prop_words:
        return 0.0
    
    overlap = len(ev_words & prop_words) / max(len(ev_words), len(prop_words))
    
    if overlap < 0.3:
        return 0.2
    
    return 0.0


# ---------------------------------------------------------------------------
# Coverage Calculation
# ---------------------------------------------------------------------------


def weighted_mean(values: list[float], weights: list[float] | None = None) -> float:
    """Calculate weighted mean."""
    if not values:
        return 0.0
    
    if weights is None:
        weights = [1.0] * len(values)
    
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    
    return sum(v * w for v, w in zip(values, weights, strict=False)) / total_weight


def calculate_proposition_coverage(
    proposition: Proposition,
    candidates: list[Evidence],
    mode: CoverageMode = CoverageMode.UNIVERSAL,
) -> PropositionCoverage:
    """Calculate coverage scores for a single proposition."""
    result = PropositionCoverage(proposition=proposition)
    
    if not candidates:
        result.uncovered_slots = list(proposition.slots.keys())
        return result
    
    # Initialize slot coverage
    slot_coverage: dict[str, float] = {z: 0.0 for z in proposition.slots.keys()}
    max_conflict = 0.0
    best_text_overlap = 0.0
    best_fb_coherence = 0.0
    
    for evidence in candidates:
        # Check for hard contradiction
        if hard_contradiction(evidence, proposition):
            max_conflict = max(max_conflict, contradiction_score(evidence, proposition))
            result.conflicting_evidence.append((evidence, contradiction_score(evidence, proposition)))
            continue
        
        # Calculate slot matches
        for slot_name in proposition.slots.keys():
            c = slot_match(evidence, proposition, slot_name, mode)
            rho = novelty_factor(evidence, proposition, slot_name)
            
            # Accumulate coverage
            slot_coverage[slot_name] = 1 - (1 - slot_coverage[slot_name]) * (1 - rho * c)
        
        # Text-level overlap (fallback)
        text_overlap = text_overlap_score(evidence, proposition)
        if text_overlap > best_text_overlap:
            best_text_overlap = text_overlap
        
        # Source excerpt matching (CRITICAL for accurate coverage)
        # Check if evidence has source_excerpt and it matches proposition text
        if evidence.extra_text and proposition.text:
            excerpt_lower = evidence.extra_text.lower().strip()
            prop_lower = proposition.text.lower().strip()
            # Direct match - highest priority
            if excerpt_lower == prop_lower:
                best_text_overlap = 1.0
                result.matched_evidence = [evidence]  # Replace with best match only
                result.match_method = "excerpt_exact"
                # Set perfect scores
                for slot_name in slot_coverage:
                    slot_coverage[slot_name] = 1.0
                # Early exit for exact match
                continue
            # High similarity partial match (>80%)
            elif excerpt_lower in prop_lower or prop_lower in excerpt_lower:
                overlap_ratio = min(len(excerpt_lower), len(prop_lower)) / max(len(excerpt_lower), len(prop_lower))
                if overlap_ratio > 0.8:
                    best_text_overlap = max(best_text_overlap, overlap_ratio)
                    # Only set as primary match if this is the best match so far
                    if overlap_ratio > 0.9:
                        result.match_method = "excerpt_high"
                        if evidence not in result.matched_evidence:
                            result.matched_evidence.append(evidence)
                    # Boost slot coverage for high similarity
                    for slot_name in slot_coverage:
                        slot_coverage[slot_name] = max(slot_coverage[slot_name], overlap_ratio * 0.95)
        
        # Front/back coherence
        fb_coherence = front_back_coherence_score(evidence, proposition)
        if fb_coherence > best_fb_coherence:
            best_fb_coherence = fb_coherence
            result.front_back_match = True
        
        # Track matched evidence (only high-quality matches)
        if any(slot_coverage[z] > 0.2 for z in proposition.slots.keys()) or text_overlap > 0.3:
            # Only add if not already matched via excerpt
            if evidence not in result.matched_evidence:
                # For non-excerpt matches, require higher threshold
                if not result.match_method.startswith("excerpt"):
                    # Only add if this is a strong match
                    if text_overlap > 0.6 or any(slot_coverage[z] > 0.5 for z in proposition.slots.keys()):
                        result.matched_evidence.append(evidence)
                        result.match_method = "slot" if any(slot_coverage[z] > 0.2 for z in proposition.slots.keys()) else "text"
                else:
                    # Excerpt matches are always high quality
                    result.matched_evidence.append(evidence)
        
        # Soft conflict
        max_conflict = max(max_conflict, soft_conflict_score(evidence, proposition))
    
    result.conflict_score = max_conflict
    
    # Boost coverage for good text overlap
    if best_text_overlap > 0.3:
        for slot_name in slot_coverage:
            slot_coverage[slot_name] = max(slot_coverage[slot_name], best_text_overlap * 0.8)
    
    # Boost for front/back coherence
    if best_fb_coherence > 0.5:
        for slot_name in slot_coverage:
            slot_coverage[slot_name] = max(slot_coverage[slot_name], best_fb_coherence * 0.7)
    
    # Calculate aggregate scores
    if proposition.core_slots:
        core_values = [slot_coverage.get(z, 0.0) for z in proposition.core_slots]
        result.core_score = weighted_mean(core_values)
    
    all_slots = list(proposition.slots.keys())
    if all_slots:
        all_values = [slot_coverage.get(z, 0.0) for z in all_slots]
        result.all_score = weighted_mean(all_values)
    
    if proposition.critical_slots:
        critical_values = [slot_coverage.get(z, 0.0) for z in proposition.critical_slots]
        result.compliance_score = min(critical_values) if critical_values else 0.0
    else:
        result.compliance_score = result.all_score
    
    result.exact_score = result.all_score * result.compliance_score * (1 - result.conflict_score)
    
    # Identify uncovered slots
    result.uncovered_slots = [z for z, cov in slot_coverage.items() if cov < 0.3]
    
    return result


# ---------------------------------------------------------------------------
# Span Aggregation
# ---------------------------------------------------------------------------


def aggregate_span_scores(
    propositions: list[PropositionCoverage],
) -> dict[str, dict[str, float]]:
    """Aggregate proposition scores by span."""
    span_props: dict[str, list[PropositionCoverage]] = {}
    
    for pc in propositions:
        span_id = pc.proposition.span_id
        if span_id not in span_props:
            span_props[span_id] = []
        span_props[span_id].append(pc)
    
    span_scores: dict[str, dict[str, float]] = {}
    
    for span_id, props in span_props.items():
        masses = [p.proposition.mass for p in props]
        
        span_scores[span_id] = {
            "core": weighted_mean([p.core_score for p in props], masses),
            "exact": weighted_mean([p.exact_score for p in props], masses),
            "proposition_count": len(props),
        }
    
    return span_scores


# ---------------------------------------------------------------------------
# Main Algorithm
# ---------------------------------------------------------------------------


def apcg_coverage(
    text: str,
    cards: list[dict[str, Any]],
    config: CoverageConfig | None = None,
) -> CoverageResult:
    """
    Main APCG coverage algorithm with specialized modes.
    
    Args:
        text: Source text to analyze
        cards: List of card dicts with keys: id, front, back, extra
        config: Coverage configuration (mode, language, etc.)
    
    Returns:
        CoverageResult with detailed coverage analysis
    """
    if config is None:
        config = CoverageConfig()
    
    # Auto-detect mode if requested
    mode = config.mode
    if mode == CoverageMode.AUTO or config.auto_detect:
        detected_mode = detect_text_type(text)
        if mode == CoverageMode.AUTO:
            mode = detected_mode
    else:
        detected_mode = mode
    
    # Step 1: Discourse segmentation
    segments = discourse_segment(text)
    
    # Step 2: Semantic parsing → propositions
    propositions: list[Proposition] = []
    for i, segment in enumerate(segments):
        prop = semantic_parse(segment, f"prop_{i}", mode)
        atomic_props = atomicize(prop)
        propositions.extend(atomic_props)
    
    # Step 3: Extract evidence from cards
    all_evidence: list[Evidence] = []
    for card in cards:
        card_id = card.get("id", f"card_{len(all_evidence)}")
        front = card.get("front", "")
        back = card.get("back", "")
        extra = card.get("extra", "")
        source_excerpt = card.get("source_excerpt", "")
        
        evidence_list = parse_question_answer_into_evidence(
            card_id, front, back, extra, source_excerpt, mode
        )
        all_evidence.extend(evidence_list)
    
    # Step 4: Build glossary and canonicalize
    glossary = build_local_concept_glossary(propositions, all_evidence)
    propositions, all_evidence = canonicalize(propositions, all_evidence, glossary)
    
    # Step 5: Deduplicate evidence
    all_evidence = deduplicate_near_identical_cards(all_evidence)
    
    # Step 6: Build retrieval index
    index = build_retrieval_index(all_evidence)
    
    # Step 7: Calculate coverage for each proposition
    proposition_coverages: list[PropositionCoverage] = []
    evidence_map: dict[str, list[str]] = {}
    
    for prop in propositions:
        candidates = retrieve_top_k(index, prop, k=5)
        pc = calculate_proposition_coverage(prop, candidates, mode)
        proposition_coverages.append(pc)
        
        # Build evidence map
        evidence_map[prop.id] = [ev.card_id for ev in pc.matched_evidence]
    
    # Step 8: Aggregate by span
    span_scores = aggregate_span_scores(proposition_coverages)
    
    # Step 9: Calculate totals
    masses = [pc.proposition.mass for pc in proposition_coverages]
    total_core = weighted_mean([pc.core_score for pc in proposition_coverages], masses)
    total_exact = weighted_mean([pc.exact_score for pc in proposition_coverages], masses)
    
    # Step 10: Identify uncovered propositions
    uncovered = [pc.proposition for pc in proposition_coverages if pc.exact_score < 0.3]
    
    # Step 11: Collect conflicting cards
    conflicting_cards: list[tuple[str, float]] = []
    for pc in proposition_coverages:
        for ev, score in pc.conflicting_evidence:
            conflicting_cards.append((ev.card_id, score))
    
    return CoverageResult(
        propositions=proposition_coverages,
        span_scores=span_scores,
        total_core=total_core,
        total_exact=total_exact,
        uncovered_propositions=uncovered,
        conflicting_cards=conflicting_cards,
        evidence_map=evidence_map,
        detected_mode=detected_mode.value if isinstance(detected_mode, CoverageMode) else detected_mode,
    )


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------


def coverage_summary(result: CoverageResult) -> str:
    """Generate human-readable coverage summary."""
    lines = [
        "=== APCG Coverage Analysis v2 ===",
        f"Detected Mode: {result.detected_mode}",
        f"Total Propositions: {len(result.propositions)}",
        f"Total Core Coverage: {result.total_core:.1%}",
        f"Total Exact Coverage: {result.total_exact:.1%}",
        f"Uncovered Propositions: {len(result.uncovered_propositions)}",
        f"Conflicting Cards: {len(result.conflicting_cards)}",
        "",
    ]
    
    if result.uncovered_propositions:
        lines.append("--- Uncovered Propositions ---")
        for prop in result.uncovered_propositions[:5]:
            lines.append(f"  • {prop.text[:80]}...")
        lines.append("")
    
    if result.conflicting_cards:
        lines.append("--- Conflicting Cards ---")
        for card_id, score in result.conflicting_cards[:5]:
            lines.append(f"  • {card_id} (conflict: {score:.2f})")
        lines.append("")
    
    if result.span_scores:
        lines.append("--- Span Scores ---")
        for span_id, scores in result.span_scores.items():
            lines.append(f"  {span_id}: core={scores['core']:.1%}, exact={scores['exact']:.1%}")
    
    return "\n".join(lines)


def generate_coverage_html(
    content: str,
    propositions: list[PropositionCoverage],
) -> str:
    """Generate HTML with sentence-level coverage highlighting."""
    import html as html_module
    
    if not propositions:
        return f'<pre class="coverage-text empty">{html_module.escape(content)}</pre>'
    
    # Build coverage map by position
    coverage_map: dict[tuple[int, int], float] = {}
    for pc in propositions:
        start, end = pc.proposition.source_span
        coverage_map[(start, end)] = pc.core_score
    
    parts: list[str] = ['<pre class="coverage-text">']
    cursor = 0
    
    # Sort coverage spans by start position
    sorted_spans = sorted(coverage_map.keys(), key=lambda x: x[0])
    
    for start, end in sorted_spans:
        # Add gap before this span
        if cursor < start:
            parts.append(html_module.escape(content[cursor:start]))
        
        # Add covered/uncovered span
        score = coverage_map[(start, end)]
        text_span = content[start:end]
        
        # Check if this is a heading
        is_heading = text_span.strip().startswith('#')
        
        if is_heading:
            parts.append(html_module.escape(text_span))
        elif score >= 0.6:
            parts.append(f'<span class="coverage-token covered" data-score="{score:.2f}">{html_module.escape(text_span)}</span>')
        elif score >= 0.3:
            parts.append(f'<span class="coverage-token partial" data-score="{score:.2f}">{html_module.escape(text_span)}</span>')
        else:
            parts.append(f'<span class="coverage-token uncovered" data-score="{score:.2f}">{html_module.escape(text_span)}</span>')
        
        cursor = end
    
    # Add remaining content
    if cursor < len(content):
        parts.append(html_module.escape(content[cursor:]))
    
    parts.append('</pre>')
    return ''.join(parts)
