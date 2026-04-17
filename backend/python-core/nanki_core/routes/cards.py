import uuid
from fastapi import APIRouter, HTTPException
from ..models import SaveCardRequest, Card
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..exporters import CardExporter
from .utils import utc_now_iso

router = APIRouter(prefix="/api/notes/{note_id}/cards", tags=["cards"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)
exporter = CardExporter()


@router.post("")
async def create_card(note_id: str, payload: SaveCardRequest) -> dict:
    """Create a new card in a note."""
    note = store.load_note(note_id)
    card = Card(
        id=uuid.uuid4().hex[:12],
        type=payload.type,
        front=payload.front,
        back=payload.back,
        extra=payload.extra,
        tags=payload.tags or [],
        deck_name=payload.deck_name or note.meta.default_deck,
        source_excerpt=payload.source_excerpt,
        source_locator=payload.source_locator,
        coverage_anchor=payload.coverage_anchor,
        created_at=utc_now_iso(),
        updated_at=utc_now_iso(),
    )
    store.upsert_card(note_id, card)
    return card.model_dump()


@router.put("/{card_id}")
async def update_card(note_id: str, card_id: str, payload: SaveCardRequest) -> dict:
    """Update an existing card."""
    note = store.load_note(note_id)
    # Load existing card to preserve created_at
    existing_cards = store.load_cards(note_id)
    existing_card = next((c for c in existing_cards if c.id == card_id), None)
    created_at = existing_card.created_at if existing_card else payload.created_at or utc_now_iso()
    
    card = Card(
        id=card_id,
        type=payload.type,
        front=payload.front,
        back=payload.back,
        extra=payload.extra,
        tags=payload.tags or [],
        deck_name=payload.deck_name or note.meta.default_deck,
        source_excerpt=payload.source_excerpt,
        source_locator=payload.source_locator,
        coverage_anchor=payload.coverage_anchor,
        created_at=created_at,
        updated_at=utc_now_iso(),
    )
    store.upsert_card(note_id, card)
    return card.model_dump()


@router.delete("/{card_id}")
async def delete_card(note_id: str, card_id: str) -> dict:
    """Delete a card."""
    try:
        store.delete_card(note_id, card_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "success", "message": f"Card {card_id} deleted"}


@router.post("/export/csv")
async def export_csv(note_id: str) -> dict:
    """Export cards to CSV."""
    note = store.load_note(note_id)
    path = store.export_path(note_id, ".csv")
    exporter.export_csv(note, path)
    return {
        "path": str(path),
        "filename": path.name,
        "url": f"/api/download?path={path}",
    }


@router.post("/export/anki-txt")
async def export_anki_txt(note_id: str) -> dict:
    """Export cards to Anki TXT format."""
    note = store.load_note(note_id)
    path = store.export_path(note_id, ".txt")
    exporter.export_anki_txt(note, path)
    return {
        "path": str(path),
        "filename": path.name,
        "url": f"/api/download?path={path}",
    }


@router.post("/export/apkg")
async def export_apkg(note_id: str) -> dict:
    """Export cards to APKG."""
    note = store.load_note(note_id)
    path = store.export_path(note_id, ".apkg")
    exporter.export_apkg(note, path)
    return {
        "path": str(path),
        "filename": path.name,
        "url": f"/api/download?path={path}",
    }
