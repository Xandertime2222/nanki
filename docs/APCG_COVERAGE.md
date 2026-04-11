# APCG Coverage Analysis

**APCG (Advanced Propositional Coverage Graph)** is Nanki's intelligent coverage analysis algorithm that helps you identify gaps in your flashcard coverage.

## Overview

APCG analyzes your study materials and compares them against your existing flashcards to show:

- ✅ Which topics are well covered
- ⚠️ Which topics have partial coverage
- ❌ Which topics are completely missing cards
- ⚡ Conflicting information between cards

## Specialized Modes

APCG offers 4 specialized analysis modes optimized for different types of content:

### 📜 FACTS Mode
**Best for:** History, Geography, Events, Biographies

- Focuses on dates, names, locations, events
- Patterns: years, battles, founding dates, capitals
- Matching: Exact facts > semantic similarity

**Example:**
```text
Der Erste Weltkrieg begann 1914.
Die Schlacht bei Verdun dauerte 300 Tage.
```

### 🔬 PROCESS Mode
**Best for:** Biology, Medicine, Chemistry, Physics

- Focuses on causal relationships, locations, transformations
- Patterns: "produces", "converts", "located in", "causes"
- Matching: Process flows > individual facts

**Example:**
```text
Die Mitochondrien produzieren ATP.
Insulin wird in den Beta-Zellen produziert.
```

### 📖 DEFINITION Mode
**Best for:** Vocabulary, Concepts, Theories, Terminology

- Focuses on definitions, categories, synonyms
- Patterns: "is a", "means", "called", "refers to"
- Matching: Conceptual understanding > details

**Example:**
```text
Ein Organ ist eine Struktur aus Geweben.
Die Zelle ist die Grundeinheit des Lebens.
```

### 🌐 UNIVERSAL Mode
**Best for:** Mixed content, General study materials

- Balanced approach across all patterns
- Fallback to keyword overlap when uncertain
- Good default for unknown content types

### 🤖 AUTO Mode (Recommended)
Automatically detects the best mode for your content by analyzing:
- Year/date frequency → FACTS
- Process verbs → PROCESS
- Definition patterns → DEFINITION
- Mixed signals → UNIVERSAL

## How It Works

### 1. Discourse Segmentation
Your text is split into individual propositions (atomic claims).

### 2. Semantic Parsing
Each proposition is analyzed to extract structured slots:
- Subjects, predicates
- Locations, times
- Causes, effects
- Quantities, measurements

### 3. Card Evidence Extraction
Your flashcards are analyzed:
- Front side (question/topic)
- Back side (answer/facts)
- Extra information
- Front/back relationship quality

### 4. Glossary Canonicalization
Terms are normalized to handle variations:
- "produziert" = "produces"
- "ist" = "sind" = "is" = "are"

### 5. Matching & Scoring
Each proposition is matched against cards using:
- **Slot matching** (structured comparison)
- **Text overlap** (keyword fallback)
- **Front/back coherence** (Q&A relationship)

### 6. Coverage Calculation
Scores are calculated:
- **Core Coverage**: Essential slots covered
- **Exact Coverage**: All slots covered with no conflicts
- **Compliance**: Critical slots covered
- **Conflict Score**: Contradictions detected

## API Usage

### Analyze Coverage
```bash
POST /api/notes/{note_id}/coverage/apcg
Query params:
  - mode: "auto" | "facts" | "process" | "definition" | "universal"
  - include_anki_cards: true | false

Response:
{
  "detected_mode": "process",
  "total_core_coverage": 0.45,
  "total_exact_coverage": 0.22,
  "total_propositions": 12,
  "uncovered_count": 5,
  "propositions": [...],
  "uncovered": [...],
  "conflicts": [...]
}
```

### Quick Summary
```bash
GET /api/notes/{note_id}/coverage/summary
Query params:
  - mode: "auto" | "facts" | "process" | "definition" | "universal"

Response:
{
  "detected_mode": "process",
  "core_coverage": 45.0,
  "exact_coverage": 22.0,
  "propositions_count": 12,
  "uncovered_count": 5,
  "coverage_level": "medium"
}
```

## Python Usage

```python
from noteforge_anki_studio.coverage_apcg import (
    apcg_coverage,
    CoverageConfig,
    CoverageMode,
    coverage_summary
)

text = "Die Mitochondrien produzieren ATP durch Zellatmung."
cards = [
    {"id": "c1", "front": "Was produzieren Mitochondrien?", "back": "ATP"}
]

config = CoverageConfig(mode=CoverageMode.AUTO)
result = apcg_coverage(text, cards, config)

print(coverage_summary(result))
print(f"Core Coverage: {result.total_core:.1%}")
```

## Coverage Levels

| Level | Core Coverage | Meaning |
|-------|---------------|---------|
| 🟢 High | > 60% | Most topics well covered |
| 🟡 Medium | 30-60% | Some gaps exist |
| 🔴 Low | < 30% | Significant gaps |

## Conflict Detection

APCG can identify conflicting information:

- **Hard conflicts**: Different years, quantities, facts
- **Soft conflicts**: Partial disagreements, low text overlap

Conflicting cards are flagged for review.

## Front/Back Relationship Analysis

The algorithm considers:

- Is this a Q&A card?
- Does the back answer the front question?
- Do both sides share key concepts?
- Does the back add new information?

Good front/back coherence improves coverage scores.

## Best Practices

1. **Use AUTO mode** for unknown content
2. **Review uncovered propositions** to identify gaps
3. **Check conflicts** for potentially wrong cards
4. **Combine with Anki cards** for complete analysis
5. **Re-analyze after adding cards** to track improvement

## Limitations

- Works best with declarative knowledge (facts, concepts)
- Less effective for procedural knowledge (how-to steps)
- Requires reasonable card quality (clear Q&A)
- Language support: German and English

## Future Improvements

- [ ] Multi-language support expansion
- [ ] Diagram/image coverage
- [ ] Spaced repetition integration
- [ ] Gap-filling card suggestions
- [ ] Difficulty estimation

---

**Source:** `/src/noteforge_anki_studio/coverage_apcg.py`

**Tests:** `/test_apcg_v2_modes.py`
