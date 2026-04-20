from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..coverage_apcg import (
    apcg_coverage,
    coverage_summary,
    CoverageConfig,
    CoverageMode,
    detect_text_type,
    generate_coverage_html,
)

router = APIRouter(prefix="/api/notes/{note_id}/coverage", tags=["coverage"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)

MODE_MAP = {
    "auto": CoverageMode.AUTO,
    "history": CoverageMode.HISTORY,
    "science": CoverageMode.SCIENCE,
    "vocabulary": CoverageMode.VOCABULARY,
    "universal": CoverageMode.UNIVERSAL,
    "facts": CoverageMode.HISTORY,
    "process": CoverageMode.SCIENCE,
    "definition": CoverageMode.VOCABULARY,
}


def _unpack_note(note):
    """Extract content and cards list from a NoteDocument."""
    content = (note.content or "").strip()
    cards = [
        {
            "id": c.id,
            "front": c.front or "",
            "back": c.back or "",
            "extra": c.extra or "",
            "source_excerpt": c.source_excerpt or "",
        }
        for c in note.cards
    ]
    return content, cards


class APCGRequest(BaseModel):
    mode: str = "auto"


@router.get("")
async def get_coverage(note_id: str, mode: str = "auto") -> dict:
    """Get coverage analysis for a note."""
    try:
        note = store.load_note(note_id)
        content, cards = _unpack_note(note)

        if not content:
            return {"coverage": {"total_core": 0, "total_exact": 0, "propositions": [], "uncovered_propositions": [], "conflicting_cards": [], "evidence_map": {}, "detected_mode": ""}, "html": ""}

        coverage_mode = MODE_MAP.get(mode.lower(), CoverageMode.AUTO)
        config = CoverageConfig(mode=coverage_mode, auto_detect=(coverage_mode == CoverageMode.AUTO))
        result = apcg_coverage(content, cards, config)
        html = generate_coverage_html(content, result.propositions)

        return {
            "coverage": asdict(result),
            "html": html,
        }

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/apcg")
async def post_coverage_apcg(note_id: str, payload: APCGRequest) -> dict:
    """Get APCG coverage via POST with mode selection."""
    try:
        note = store.load_note(note_id)
        content, cards = _unpack_note(note)

        if not content:
            return {"coverage": {"total_core": 0, "total_exact": 0, "propositions": [], "uncovered_propositions": [], "conflicting_cards": [], "evidence_map": {}, "detected_mode": ""}, "html": ""}

        mode = payload.mode or "apcg"
        coverage_mode = MODE_MAP.get(mode.lower(), CoverageMode.AUTO)
        config = CoverageConfig(mode=coverage_mode, auto_detect=(coverage_mode == CoverageMode.AUTO))
        result = apcg_coverage(content, cards, config)
        html = generate_coverage_html(content, result.propositions)

        return {
            "coverage": asdict(result),
            "html": html,
        }

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/summary")
async def get_coverage_summary(note_id: str) -> dict:
    """Get coverage summary for a note."""
    try:
        note = store.load_note(note_id)
        content, cards = _unpack_note(note)
        config = CoverageConfig(auto_detect=True)
        result = apcg_coverage(content, cards, config)
        summary = coverage_summary(result)
        return {"summary": summary}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
