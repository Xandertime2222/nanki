# Utility functions for AI module (moved from old coverage.py)

import re
from typing import Any

# Common terms to exclude from text analysis
COMMON_TERMS = frozenset({
    "der", "die", "das", "ein", "eine", "und", "ist", "sind", "war", "hat",
    "haben", "wird", "werden", "kann", "mit", "von", "auf", "für", "nicht",
    "the", "a", "an", "is", "are", "was", "has", "have", "will", "can",
    "with", "from", "on", "for", "not", "to", "in", "of", "at", "by",
})


def unique_preserve_order(items: list[Any]) -> list[Any]:
    """Remove duplicates while preserving order."""
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def plain_card_text(card: dict[str, Any]) -> str:
    """Extract plain text from a card for matching."""
    front = card.get("front", "") or ""
    back = card.get("back", "") or ""
    extra = card.get("extra", "") or ""
    return f"{front} {back} {extra}".strip()


def best_excerpt_for_candidates(
    text: str,
    candidates: list[Any],
    min_length: int = 10,
) -> str:
    """Find the best excerpt from text that matches one of the candidates.
    
    Candidates can be strings (direct excerpts) or dicts (with 'source_excerpt' or 'front' keys).
    """
    if not text or not candidates:
        return ""
    
    text_lower = text.lower()
    best_match = ""
    
    for candidate in candidates:
        # Handle string candidates
        if isinstance(candidate, str):
            excerpt = candidate
        # Handle dict candidates
        elif isinstance(candidate, dict):
            excerpt = candidate.get("source_excerpt", "") or candidate.get("front", "")
        else:
            continue
        
        if len(excerpt) >= min_length and excerpt.lower() in text_lower:
            if len(excerpt) > len(best_match):
                best_match = excerpt
    
    return best_match


def card_search_candidates(
    cards: list[dict[str, Any]],
    text: str,
    max_candidates: int = 10,
) -> list[dict[str, Any]]:
    """Find cards that might match the given text."""
    if not text or not cards:
        return []
    
    text_lower = text.lower()
    candidates = []
    
    for card in cards:
        card_text = plain_card_text(card).lower()
        source_excerpt = card.get("source_excerpt", "")
        
        # Score based on text overlap
        score = 0.0
        if source_excerpt and source_excerpt.lower() in text_lower:
            score = 1.0
        elif card_text in text_lower:
            score = 0.8
        else:
            # Partial word overlap
            words = set(re.findall(r'\b\w{4,}\b', card_text))
            text_words = set(re.findall(r'\b\w{4,}\b', text_lower))
            overlap = len(words & text_words)
            if overlap > 0:
                score = 0.3 * (overlap / max(len(words), 1))
        
        if score > 0.1:
            candidates.append((card, score))
    
    # Sort by score and return top candidates
    candidates.sort(key=lambda x: x[1], reverse=True)
    return [c[0] for c in candidates[:max_candidates]]