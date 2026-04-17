from fastapi import APIRouter, HTTPException
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..anki_connect import AnkiConnectClient

router = APIRouter(prefix="/api/anki", tags=["anki"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)
anki_client = AnkiConnectClient(settings_manager)


@router.post("/test")
async def anki_test_connection() -> dict:
    """Test AnkiConnect connection."""
    try:
        return await anki_client.test_connection()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/decks")
async def anki_decks() -> dict:
    """List Anki decks."""
    try:
        deck_names = await anki_client.deck_names()
        return {"decks": deck_names}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/push/{note_id}")
async def push_to_anki(note_id: str, deck_name: str = None) -> dict:
    """Push all cards from a note to Anki."""
    try:
        # Load note
        note = store.load_note(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Get cards from note
        cards = note.cards or []
        if not cards:
            return {"pushed": 0, "message": "No cards to push"}
        
        # Use note's default deck if not specified
        target_deck = deck_name or note.meta.default_deck or "Default"
        
        # Push cards to Anki
        pushed = 0
        for card in cards:
            try:
                # Create Anki note
                await anki_client.add_note(
                    deck_name=target_deck,
                    model_name="Basic" if card.type == "basic" else "Cloze",
                    fields={
                        "Front": card.front,
                        "Back": card.back or "",
                    },
                    tags=note.meta.tags or [],
                )
                pushed += 1
            except Exception as e:
                print(f"Failed to push card {card.id}: {e}")
                continue
        
        return {"pushed": pushed, "total": len(cards)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc