from fastapi import APIRouter, HTTPException
from ..models import CreateNoteRequest, SaveNoteRequest, DuplicateNoteRequest, NoteDocument
from ..storage import WorkspaceStore
from ..config import SettingsManager

router = APIRouter(prefix="/api/notes", tags=["notes"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)


@router.get("")
async def list_notes() -> list[dict]:
    """List all notes, sorted by pinned status and updated_at."""
    notes = store.list_notes()
    notes.sort(
        key=lambda item: (not item.meta.pinned, item.meta.updated_at), reverse=True
    )
    return [item.model_dump() for item in notes]


@router.post("")
async def create_note(payload: CreateNoteRequest) -> dict:
    """Create a new note."""
    note = store.create_note(
        title=payload.title,
        content=payload.content if payload.content is not None else f"# {payload.title}\n\n",
        tags=payload.tags,
        default_deck=payload.default_deck,
    )
    return note.model_dump()


@router.get("/{note_id}")
async def get_note(note_id: str) -> dict:
    """Get a note by ID."""
    try:
        note = store.load_note(note_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return note.model_dump()


@router.put("/{note_id}")
async def update_note(note_id: str, payload: SaveNoteRequest) -> dict:
    """Update an existing note."""
    try:
        # Load existing note
        existing_note = store.load_note(note_id)
        
        # Update fields
        updated_note = store.save_note_fields(
            note_id=note_id,
            title=payload.title,
            content=payload.content,
            tags=payload.tags,
            default_deck=payload.default_deck,
            pinned=payload.pinned,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return updated_note.model_dump()


@router.delete("/{note_id}")
async def delete_note(note_id: str) -> dict:
    """Delete a note."""
    try:
        store.delete_note(note_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "success", "message": f"Note {note_id} deleted"}


@router.post("/{note_id}/duplicate")
async def duplicate_note(note_id: str, payload: DuplicateNoteRequest) -> dict:
    """Duplicate a note."""
    try:
        new_title = payload.new_title if payload.new_title else None
        new_note = store.duplicate_note(note_id, title=new_title)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return new_note.model_dump()
