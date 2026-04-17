from fastapi import APIRouter, HTTPException
from ..models import AIChatRequest, AIExplainRequest, AIGenerateCardsRequest, AISuggestCardsForGapsRequest
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..ai import AIService, AIConfigurationError, AIServiceError

router = APIRouter(prefix="/api/ai", tags=["ai"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)
ai_service = AIService(settings_manager, None)  # anki_client wird bei Bedarf geladen


@router.post("/test")
async def ai_test_connection() -> dict:
    """Test AI provider connection."""
    settings = settings_manager.load()
    try:
        return await ai_service.test_connection(settings)
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/models")
async def ai_models() -> dict:
    """List available AI models."""
    settings = settings_manager.load()
    try:
        return await ai_service.list_models(settings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/chat")
async def ai_chat(payload: AIChatRequest) -> dict:
    """AI chat conversation."""
    settings = settings_manager.load()
    note = store.load_note(payload.note_id) if payload.note_id else None
    try:
        return await ai_service.chat(
            settings,
            note=note,
            messages=[message.model_dump() for message in payload.messages],
            context_text=payload.context_text,
            selected_text=payload.selected_text,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/explain")
async def ai_explain(payload: AIExplainRequest) -> dict:
    """AI explain text."""
    settings = settings_manager.load()
    note = store.load_note(payload.note_id) if payload.note_id else None
    try:
        return await ai_service.explain(
            settings,
            note=note,
            text=payload.text,
            context_text=payload.context_text,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/generate-cards")
async def ai_generate_cards(payload: AIGenerateCardsRequest) -> dict:
    """AI generate flashcards from text."""
    settings = settings_manager.load()
    note = store.load_note(payload.note_id) if payload.note_id else None
    try:
        return await ai_service.generate_cards(
            settings,
            note=note,
            text=payload.text,
            num_cards=payload.num_cards,
            card_type=payload.card_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/suggest-cards-for-gaps")
async def ai_suggest_cards_for_gaps(payload: AISuggestCardsForGapsRequest) -> dict:
    """AI suggest cards for coverage gaps."""
    settings = settings_manager.load()
    note = store.load_note(payload.note_id) if payload.note_id else None
    try:
        return await ai_service.suggest_cards_for_gaps(
            settings,
            note=note,
            gaps=payload.gaps,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
