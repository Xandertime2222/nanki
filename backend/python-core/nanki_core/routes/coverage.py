from fastapi import APIRouter, HTTPException
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


@router.get("")
async def get_coverage(note_id: str, mode: str = "apcg") -> dict:
    """Get coverage analysis for a note."""
    try:
        note = store.load_note(note_id)
        
        if mode == "apcg":
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
        else:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")
            
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
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
