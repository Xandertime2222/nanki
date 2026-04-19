from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..models import CoverageAnchor
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


class APCGRequest(BaseModel):
    mode: str = "auto"


@router.get("")
async def get_coverage(note_id: str, mode: str = "auto") -> dict:
    """Get coverage analysis for a note."""
    try:
        note = store.load_note(note_id)

        # Validate mode against CoverageMode enum values
        valid_modes = [m.value for m in CoverageMode]
        if mode not in valid_modes:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}. Valid modes: {valid_modes}")

        config = CoverageConfig(
            mode=CoverageMode(mode),
            include_anki_cards=settings_manager.load().apcg.include_anki_cards,
        )
        result = apcg_coverage(note, config)
        html = generate_coverage_html(note, result)

        return {
            "coverage": result.model_dump(),
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

        mode = payload.mode or "apcg"
        if mode not in [m.value for m in CoverageMode]:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")

        config = CoverageConfig(
            mode=CoverageMode(mode),
            include_anki_cards=settings_manager.load().apcg.include_anki_cards,
        )
        result = apcg_coverage(note, config)
        html = generate_coverage_html(note, result)

        return {
            "coverage": result.model_dump(),
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
        summary = coverage_summary(note)
        return summary.model_dump()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
