from __future__ import annotations

import uuid
from pathlib import Path

import mistune
import markdownify as md
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .ai import AIConfigurationError, AIService, AIServiceError
from .anki_connect import AnkiConnectClient, AnkiConnectError
from .config import SettingsManager
from .coverage import build_note_coverage
from .coverage_apcg import (
    apcg_coverage,
    coverage_summary,
    CoverageConfig,
    CoverageMode,
    detect_text_type,
)
from .exporters import CardExporter
from .importers import ImportService, UnsupportedImportError
from .updater import is_update_available
from .models import (
    AIChatRequest,
    AIExplainRequest,
    AIGenerateCardsRequest,
    AISuggestCardsForGapsRequest,
    AppSettings,
    AnkiPushRequest,
    Card,
    CreateNoteRequest,
    DuplicateNoteRequest,
    HtmlToMarkdownRequest,
    ImportTextRequest,
    RenderMarkdownRequest,
    SaveCardRequest,
    SaveNoteRequest,
    WorkspaceUpdateRequest,
    AppState,
)
from .storage import WorkspaceStore, utc_now_iso

BASE_DIR = Path(__file__).resolve().parent

markdown_renderer = mistune.create_markdown(
    plugins=["strikethrough", "table", "task_lists", "url"]
)

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)
import_service = ImportService()
exporter = CardExporter()
anki_client = AnkiConnectClient(settings_manager)
ai_service = AIService(settings_manager, anki_client)

app = FastAPI(title="Nanki")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "index.html",
        {"request": request, "app_name": "Nanki"},
    )


@app.get("/api/settings")
async def get_settings() -> AppSettings:
    return settings_manager.load()


@app.put("/api/settings")
async def update_settings(payload: AppSettings) -> AppSettings:
    return settings_manager.save(payload)


@app.get("/api/state")
async def get_state() -> AppState:
    """Get app state (onboarding, update checks, etc.)"""
    return AppState.model_validate(settings_manager.load_state())


@app.put("/api/state")
async def update_state(payload: AppState) -> AppState:
    """Update app state (onboarding, update checks, etc.)"""
    return AppState.model_validate(settings_manager.save_state(payload.model_dump()))


@app.get("/api/updates/check")
async def check_for_updates() -> dict:
    """Check GitHub for latest release"""
    import httpx

    current_version = "0.5.0"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.github.com/repos/Xandertime2222/nanki/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
            )
            if response.status_code == 200:
                release = response.json()
                latest_version = release.get("tag_name", "v0.0.0").lstrip("v")

                def parse_version(v: str) -> tuple:
                    parts = v.split(".")
                    return tuple(int(p) for p in parts[:3] if p.isdigit())

                current_tuple = parse_version(current_version)
                latest_tuple = parse_version(latest_version)

                has_update = latest_tuple > current_tuple

                return {
                    "current_version": current_version,
                    "latest_version": latest_version,
                    "has_update": has_update,
                    "release_url": release.get("html_url", ""),
                    "release_notes": release.get("body", ""),
                    "checked_at": utc_now_iso(),
                }
    except Exception as e:
        pass

    return {
        "current_version": current_version,
        "latest_version": current_version,
        "has_update": False,
        "release_url": "",
        "release_notes": "",
        "checked_at": utc_now_iso(),
    }


@app.post("/api/settings/workspace")
async def update_workspace(payload: WorkspaceUpdateRequest) -> AppSettings:
    settings = settings_manager.load()
    settings.workspace_path = payload.workspace_path
    return settings_manager.save(settings)


@app.post("/api/settings/prompts/reset")
async def reset_prompts() -> dict:
    """Reset AI prompts to default values with evidence-based best practices."""
    from . import prompts
    from .models import AIPromptSettings

    try:
        settings = settings_manager.load()

        # Reset to default prompts (which now include evidence-based best practices)
        settings.ai.prompts = AIPromptSettings()

        settings_manager.save(settings)

        return {
            "status": "success",
            "message": "Prompts reset to default with evidence-based best practices",
            "prompts": {
                "flashcard": prompts.DEFAULT_FLASHCARD_SYSTEM_PROMPT,
                "auto_flashcard": prompts.DEFAULT_AUTO_FLASHCARD_SYSTEM_PROMPT,
            },
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset prompts: {str(exc)}"
        )


@app.post("/api/settings/apcg/reset")
async def reset_apcg_settings() -> dict:
    """Reset APCG settings to default values."""
    from .models import APCGSettings

    try:
        settings = settings_manager.load()

        # Reset to default APCG settings
        settings.apcg = APCGSettings()

        settings_manager.save(settings)

        return {
            "status": "success",
            "message": "APCG settings reset to default",
            "apcg": {
                "default_mode": settings.apcg.default_mode,
                "include_anki_cards": settings.apcg.include_anki_cards,
                "auto_refresh": settings.apcg.auto_refresh,
            },
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset APCG settings: {str(exc)}"
        )


@app.get("/api/notes")
async def list_notes() -> list[dict]:
    notes = store.list_notes()
    notes.sort(
        key=lambda item: (not item.meta.pinned, item.meta.updated_at), reverse=True
    )
    return [item.model_dump() for item in notes]


@app.post("/api/notes")
async def create_note(payload: CreateNoteRequest) -> dict:
    note = store.create_note(
        title=payload.title,
        content=payload.content
        if payload.content is not None
        else f"# {payload.title}\n\n",
        tags=payload.tags,
        default_deck=payload.default_deck,
    )
    return note.model_dump()


@app.get("/api/notes/{note_id}")
async def get_note(note_id: str) -> dict:
    try:
        note = store.load_note(note_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return note.model_dump()


@app.put("/api/notes/{note_id}")
async def save_note(note_id: str, payload: SaveNoteRequest) -> dict:
    try:
        note = store.save_note_fields(
            note_id,
            title=payload.title,
            tags=payload.tags,
            pinned=payload.pinned,
            content=payload.content,
            default_deck=payload.default_deck,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return note.model_dump()


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str) -> dict:
    store.delete_note(note_id)
    return {"ok": True}


@app.post("/api/notes/{note_id}/duplicate")
async def duplicate_note(note_id: str, payload: DuplicateNoteRequest) -> dict:
    try:
        duplicated = store.duplicate_note(note_id, title=payload.title)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return duplicated.model_dump()


@app.post("/api/import/file")
async def import_file(file: UploadFile = File(...)) -> dict:
    try:
        title, content, manifest, data = await import_service.import_upload(file)
    except UnsupportedImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    note = store.create_note(
        title=title,
        content=content,
        source_type=manifest.source_type,
        original_filename=file.filename,
        source=manifest,
    )
    if file.filename:
        saved_name = store.save_source_file(note.meta.id, file.filename, data)
        manifest.stored_filename = saved_name
        note.source = manifest
        note = store.save_note_document(note)
    return note.model_dump()


@app.post("/api/import/text")
async def import_text(payload: ImportTextRequest) -> dict:
    title, content, manifest, data = import_service.import_text_payload(
        payload.title,
        payload.text,
        payload.source_type,
    )
    note = store.create_note(
        title=title,
        content=content,
        tags=payload.tags,
        source_type=manifest.source_type,
        original_filename=manifest.original_filename,
        default_deck=payload.default_deck,
        source=manifest,
    )
    saved_name = store.save_source_file(
        note.meta.id, manifest.original_filename or f"{title}.txt", data
    )
    manifest.stored_filename = saved_name
    note.source = manifest
    note = store.save_note_document(note)
    return note.model_dump()


@app.get("/api/notes/{note_id}/source")
async def get_note_source(note_id: str) -> dict:
    note = store.load_note(note_id)
    if not note.source:
        return {"source": None}
    payload = note.source.model_dump()
    if note.source.stored_filename:
        payload["file_url"] = (
            f"/api/notes/{note_id}/source/file/{note.source.stored_filename}"
        )
    return {"source": payload}


@app.get("/api/notes/{note_id}/source/file/{filename}")
async def get_source_file(note_id: str, filename: str) -> FileResponse:
    try:
        path = store.get_source_file_path(note_id, filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path)


@app.get("/api/notes/{note_id}/coverage")
async def get_note_coverage(
    note_id: str, mode: str = "auto", include_anki_cards: bool = True
) -> dict:
    """Analyze note coverage using APCG algorithm."""
    from .coverage_apcg import apcg_coverage, CoverageConfig, CoverageMode

    try:
        note = store.load_note(note_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    content = note.content or ""
    if not content.strip():
        return {
            "total_core_coverage": 0,
            "total_exact_coverage": 0,
            "total_propositions": 0,
            "uncovered_count": 0,
            "propositions": [],
            "conflicts": [],
        }

    cards = []
    for card in note.cards:
        cards.append(
            {
                "id": card.id,
                "front": card.front or "",
                "back": card.back or "",
                "extra": card.extra or "",
            }
        )

    if include_anki_cards:
        try:
            anki_cards = await anki_client.get_cards_for_note(
                note.meta.title or note_id
            )
            for ac in anki_cards:
                cards.append(
                    {
                        "id": f"anki:{ac.get('cardId', '')}",
                        "front": ac.get("fields", {}).get("Front", ""),
                        "back": ac.get("fields", {}).get("Back", ""),
                        "extra": ac.get("fields", {}).get("Extra", ""),
                    }
                )
        except Exception:
            pass

    mode_map = {
        "auto": CoverageMode.AUTO,
        "facts": CoverageMode.FACTS,
        "process": CoverageMode.PROCESS,
        "definition": CoverageMode.DEFINITION,
        "universal": CoverageMode.UNIVERSAL,
    }
    coverage_mode = mode_map.get(mode.lower(), CoverageMode.AUTO)
    config = CoverageConfig(
        mode=coverage_mode, auto_detect=(coverage_mode == CoverageMode.AUTO)
    )
    result = apcg_coverage(content, cards, config)

    response = {
        "detected_mode": result.detected_mode,
        "total_core_coverage": result.total_core,
        "total_exact_coverage": result.total_exact,
        "total_propositions": len(result.propositions),
        "uncovered_count": len(result.uncovered_propositions),
        "conflicts": [],
        "propositions": [],
    }

    for pc in result.propositions:
        prop_data = {
            "id": pc.proposition.id,
            "text": pc.proposition.text,
            "type": pc.proposition.proposition_type,
            "core_score": pc.core_score,
            "exact_score": pc.exact_score,
            "matched": len(pc.matched_evidence) > 0,
            "match_method": pc.match_method,
            "front_back_match": pc.front_back_match,
            "uncovered_slots": pc.uncovered_slots,
            "matched_card_ids": [ev.card_id for ev in pc.matched_evidence],
        }
        response["propositions"].append(prop_data)

    for card_id, score in result.conflicting_cards:
        response["conflicts"].append(
            {
                "card_id": card_id,
                "conflict_score": score,
                "description": f"Card {card_id} has conflicting coverage",
            }
        )

    return response


@app.post("/api/render-markdown")
async def render_markdown(payload: RenderMarkdownRequest) -> dict:
    html_output = markdown_renderer(payload.markdown)
    return {"html": html_output}


@app.post("/api/convert-html")
async def convert_html(payload: HtmlToMarkdownRequest) -> dict:
    markdown = md.markdownify(
        payload.html or "",
        heading_style="ATX",
        bullets="-",
    ).strip()
    if markdown:
        markdown += "\n"
    return {"markdown": markdown}


@app.post("/api/notes/{note_id}/cards")
async def create_card(note_id: str, payload: SaveCardRequest) -> dict:
    note = store.load_note(note_id)
    card = Card(
        id=uuid.uuid4().hex[:12],
        type=payload.type,
        front=payload.front,
        back=payload.back,
        extra=payload.extra,
        tags=payload.tags,
        deck_name=payload.deck_name or note.meta.default_deck,
        source_excerpt=payload.source_excerpt,
        source_locator=payload.source_locator,
        coverage_anchor=payload.coverage_anchor,
        created_at=utc_now_iso(),
        updated_at=utc_now_iso(),
    )
    store.upsert_card(note_id, card)
    return card.model_dump()


@app.put("/api/notes/{note_id}/cards/{card_id}")
async def update_card(note_id: str, card_id: str, payload: SaveCardRequest) -> dict:
    note = store.load_note(note_id)
    existing = next((card for card in note.cards if card.id == card_id), None)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    existing.type = payload.type
    existing.front = payload.front
    existing.back = payload.back
    existing.extra = payload.extra
    existing.tags = payload.tags
    existing.deck_name = payload.deck_name or note.meta.default_deck
    existing.source_excerpt = payload.source_excerpt
    existing.source_locator = payload.source_locator
    existing.coverage_anchor = payload.coverage_anchor
    existing.updated_at = utc_now_iso()
    store.upsert_card(note_id, existing)
    return existing.model_dump()


@app.delete("/api/notes/{note_id}/cards/{card_id}")
async def delete_card(note_id: str, card_id: str) -> dict:
    store.delete_card(note_id, card_id)
    return {"ok": True}


@app.post("/api/notes/{note_id}/cards/export/csv")
async def export_csv(note_id: str) -> dict:
    note = store.load_note(note_id)
    path = store.export_path(note_id, ".csv")
    exporter.export_csv(note, path)
    return {
        "path": str(path),
        "filename": path.name,
        "url": f"/api/download?path={path}",
    }


@app.post("/api/notes/{note_id}/cards/export/anki-txt")
async def export_anki_txt(note_id: str) -> dict:
    note = store.load_note(note_id)
    path = store.export_path(note_id, ".txt")
    exporter.export_anki_txt(note, path)
    return {
        "path": str(path),
        "filename": path.name,
        "url": f"/api/download?path={path}",
    }


@app.post("/api/notes/{note_id}/cards/export/apkg")
async def export_apkg(note_id: str) -> dict:
    note = store.load_note(note_id)
    path = store.export_path(note_id, ".apkg")
    exporter.export_apkg(note, path)
    return {
        "path": str(path),
        "filename": path.name,
        "url": f"/api/download?path={path}",
    }


@app.get("/api/download")
async def download_export(path: str) -> FileResponse:
    requested = Path(path).expanduser().resolve()
    exports_root = store.exports_root.resolve()
    try:
        requested.relative_to(exports_root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid download path") from exc
    if not requested.exists():
        raise HTTPException(status_code=404, detail="Export not found")
    return FileResponse(requested, filename=requested.name)


@app.post("/api/anki/test")
async def anki_test_connection() -> dict:
    try:
        return await anki_client.test_connection()
    except (AnkiConnectError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/anki/decks")
async def anki_decks() -> dict:
    try:
        decks = await anki_client.deck_names()
        models = await anki_client.model_names()
    except (AnkiConnectError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"decks": decks, "models": models}


@app.post("/api/ai/test")
async def ai_test_connection() -> dict:
    settings = settings_manager.load()
    try:
        return await ai_service.test_connection(settings)
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/ai/models")
async def ai_models() -> dict:
    settings = settings_manager.load()
    try:
        return await ai_service.list_models(settings)
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/update/check")
async def check_for_updates() -> dict:
    """Check if a new version of Nanki is available."""
    return is_update_available()


@app.post("/api/ai/chat")
async def ai_chat(payload: AIChatRequest) -> dict:
    settings = settings_manager.load()
    note = store.load_note(payload.note_id) if payload.note_id else None
    try:
        return await ai_service.chat(
            settings,
            note=note,
            messages=[message.model_dump() for message in payload.messages],
            context_text=payload.context_text,
            selected_text=payload.selected_text,
            question=payload.question,
            model=payload.model,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/ai/explain")
async def ai_explain(payload: AIExplainRequest) -> dict:
    settings = settings_manager.load()
    note = store.load_note(payload.note_id) if payload.note_id else None
    try:
        return await ai_service.explain(
            settings,
            note=note,
            selected_text=payload.selected_text,
            question=payload.question,
            model=payload.model,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/ai/generate-cards")
async def ai_generate_cards(payload: AIGenerateCardsRequest) -> dict:
    settings = settings_manager.load()
    try:
        note = store.load_note(payload.note_id)
        return await ai_service.generate_cards(
            settings,
            note=note,
            source_text=payload.source_text,
            target_count=payload.target_count,
            auto=payload.auto,
            model=payload.model,
            include_anki_coverage=(
                payload.include_anki_coverage
                if payload.include_anki_coverage is not None
                else settings.ai.use_anki_coverage_context
            ),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/notes/{note_id}/coverage/apcg")
async def analyze_coverage_apcg(
    note_id: str,
    mode: str = "auto",
    include_anki_cards: bool = True,
) -> dict:
    """Analyze note coverage using APCG algorithm with specialized modes."""
    try:
        note = store.load_note(note_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Get note content
    content = note.content or ""
    if not content.strip():
        return {"error": "Note content is empty"}

    # Build cards list from note
    cards = []
    for card in note.cards:
        cards.append(
            {
                "id": card.id,
                "front": card.front or "",
                "back": card.back or "",
                "extra": card.extra or "",
            }
        )

    # Also fetch Anki cards if requested
    if include_anki_cards:
        try:
            anki_cards = await anki_client.get_cards_for_note(
                note.meta.title or note_id
            )
            for ac in anki_cards:
                cards.append(
                    {
                        "id": f"anki:{ac.get('cardId', '')}",
                        "front": ac.get("fields", {}).get("Front", ""),
                        "back": ac.get("fields", {}).get("Back", ""),
                        "extra": ac.get("fields", {}).get("Extra", ""),
                    }
                )
        except Exception:
            pass  # Ignore Anki errors, just use local cards

    # Map mode string to enum
    mode_map = {
        "auto": CoverageMode.AUTO,
        "facts": CoverageMode.FACTS,
        "process": CoverageMode.PROCESS,
        "definition": CoverageMode.DEFINITION,
        "universal": CoverageMode.UNIVERSAL,
    }
    coverage_mode = mode_map.get(mode.lower(), CoverageMode.AUTO)

    # Run APCG analysis
    config = CoverageConfig(
        mode=coverage_mode, auto_detect=(coverage_mode == CoverageMode.AUTO)
    )
    result = apcg_coverage(content, cards, config)

    # Build response
    response = {
        "detected_mode": result.detected_mode,
        "total_core_coverage": result.total_core,
        "total_exact_coverage": result.total_exact,
        "total_propositions": len(result.propositions),
        "uncovered_count": len(result.uncovered_propositions),
        "conflicting_cards_count": len(result.conflicting_cards),
        "propositions": [],
        "uncovered": [],
        "conflicts": [],
        "span_scores": result.span_scores,
    }

    # Add proposition details
    for pc in result.propositions:
        prop_data = {
            "id": pc.proposition.id,
            "text": pc.proposition.text,
            "type": pc.proposition.proposition_type,
            "core_score": pc.core_score,
            "exact_score": pc.exact_score,
            "matched": len(pc.matched_evidence) > 0,
            "match_method": pc.match_method,
            "front_back_match": pc.front_back_match,
            "uncovered_slots": pc.uncovered_slots,
            "matched_card_ids": [ev.card_id for ev in pc.matched_evidence],
        }
        response["propositions"].append(prop_data)

    # Add uncovered propositions
    for prop in result.uncovered_propositions:
        response["uncovered"].append(
            {
                "id": prop.id,
                "text": prop.text,
                "type": prop.proposition_type,
            }
        )

    # Add conflicts
    for card_id, score in result.conflicting_cards:
        response["conflicts"].append(
            {
                "card_id": card_id,
                "conflict_score": score,
            }
        )

    return response


@app.get("/api/notes/{note_id}/coverage/summary")
async def get_coverage_summary(note_id: str, mode: str = "auto") -> dict:
    """Get quick coverage summary for a note."""
    try:
        note = store.load_note(note_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    content = note.content or ""
    cards = [
        {"id": c.id, "front": c.front, "back": c.back, "extra": c.extra}
        for c in note.cards
    ]

    mode_map = {
        "auto": CoverageMode.AUTO,
        "facts": CoverageMode.FACTS,
        "process": CoverageMode.PROCESS,
        "definition": CoverageMode.DEFINITION,
        "universal": CoverageMode.UNIVERSAL,
    }
    coverage_mode = mode_map.get(mode.lower(), CoverageMode.AUTO)
    config = CoverageConfig(mode=coverage_mode)

    result = apcg_coverage(content, cards, config)

    return {
        "detected_mode": result.detected_mode,
        "core_coverage": round(result.total_core * 100, 1),
        "exact_coverage": round(result.total_exact * 100, 1),
        "propositions_count": len(result.propositions),
        "uncovered_count": len(result.uncovered_propositions),
        "coverage_level": "high"
        if result.total_core > 0.6
        else "medium"
        if result.total_core > 0.3
        else "low",
    }


@app.post("/api/ai/suggest-cards-for-gaps")
async def ai_suggest_cards_for_gaps(payload: AISuggestCardsForGapsRequest) -> dict:
    settings = settings_manager.load()
    try:
        note = store.load_note(payload.note_id)
        return await ai_service.suggest_cards_for_gaps(
            settings,
            note=note,
            gap_excerpts=payload.gap_excerpts,
            model=payload.model,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (AIConfigurationError, AIServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/notes/{note_id}/cards/push")
async def push_cards_to_anki(note_id: str, payload: AnkiPushRequest) -> dict:
    note = store.load_note(note_id)
    cards = note.cards
    if payload.card_ids:
        allowed = set(payload.card_ids)
        cards = [card for card in note.cards if card.id in allowed]
    try:
        result = await anki_client.push_cards(
            note,
            cards,
            override_deck=payload.deck_name,
            sync_after_push=(
                payload.sync_after_push
                if payload.sync_after_push is not None
                else settings_manager.load().auto_sync
            ),
        )
    except (AnkiConnectError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result.pushed:
        pushed_ids = {item["card_id"] for item in result.pushed}
        for card in note.cards:
            if card.id in pushed_ids:
                card.last_pushed_at = utc_now_iso()
        store.save_cards(note_id, note.cards)
    return {
        "pushed": result.pushed,
        "skipped": result.skipped,
        "sync_triggered": result.sync_triggered,
        "version": result.version,
    }
