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
