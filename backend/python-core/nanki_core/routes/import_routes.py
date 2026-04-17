from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from ..models import ImportTextRequest, NoteDocument
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..importers import ImportService, UnsupportedImportError

router = APIRouter(prefix="/api/import", tags=["import"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)
import_service = ImportService()


@router.post("/file")
async def import_file(
    file: UploadFile = File(...),
    title: str = None,
    tags: list[str] = None,
    default_deck: str = "Default"
) -> dict:
    """Import a file (MD, TXT, PDF, PPTX)."""
    try:
        content = await file.read()
        filename = file.filename or "unknown"
        
        # Determine source type from extension
        ext = Path(filename).suffix.lower()
        source_type_map = {
            ".md": "markdown",
            ".txt": "text",
            ".pdf": "pdf",
            ".pptx": "pptx",
        }
        source_type = source_type_map.get(ext, "unknown")
        
        # Import the file
        result = import_service.import_file_content(
            content=content,
            filename=filename,
            source_type=source_type,
        )
        
        # Create note with imported content
        note_title = title or Path(filename).stem
        note = store.create_note(
            title=note_title,
            content=result.content,
            tags=tags or [],
            default_deck=default_deck,
        )
        
        # Save source manifest if available
        if result.source_manifest:
            store.save_source_manifest(note.meta.id, result.source_manifest)
        
        return {
            "note": note.model_dump(),
            "word_count": result.word_count,
            "source_type": source_type,
        }
        
    except UnsupportedImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(exc)}") from exc


@router.post("/text")
async def import_text(payload: ImportTextRequest) -> dict:
    """Import raw text content."""
    try:
        # Create note with text content
        content = f"# {payload.title}\n\n{payload.text}"
        note = store.create_note(
            title=payload.title,
            content=content,
            tags=payload.tags,
            default_deck=payload.default_deck,
        )
        
        return {
            "note": note.model_dump(),
            "word_count": len(payload.text.split()),
            "source_type": payload.source_type,
        }
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(exc)}") from exc
