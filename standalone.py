"""
Nanki Standalone - Full-featured desktop app without local HTTP server.

Uses PyWebView's JavaScript Bridge for direct frontend-backend communication.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

import webview

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("Nanki")

# Import all services from main app
try:
    from noteforge_anki_studio.ai import AIService, AIConfigurationError, AIServiceError
    from noteforge_anki_studio.anki_connect import AnkiConnectClient, AnkiConnectError
    from noteforge_anki_studio.config import SettingsManager
    from noteforge_anki_studio.coverage import build_note_coverage
    from noteforge_anki_studio.exporters import CardExporter
    from noteforge_anki_studio.importers import ImportService, UnsupportedImportError
    from noteforge_anki_studio.models import (
        AIChatRequest,
        AIExplainRequest,
        AIGenerateCardsRequest,
        AISuggestCardsForGapsRequest,
        AnkiPushRequest,
        Card,
        AppSettings,
    )
    from noteforge_anki_studio.storage import WorkspaceStore
    SERVICES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Could not import services: {e}")
    SERVICES_AVAILABLE = False


class NankiAPI:
    """Full API exposed to JavaScript via PyWebView bridge."""

    def __init__(self):
        if not SERVICES_AVAILABLE:
            raise RuntimeError("Required services not available")
        
        self.settings_manager = SettingsManager()
        self.store = WorkspaceStore(self.settings_manager)
        self.import_service = ImportService()
        self.exporter = CardExporter()
        self.anki_client = AnkiConnectClient(self.settings_manager)
        self.ai_service = AIService(self.settings_manager, self.anki_client)

    # ==================== Settings ====================

    def get_settings(self) -> dict[str, Any]:
        """Get application settings."""
        settings = self.settings_manager.load()
        return settings.model_dump()

    def update_settings(self, settings: dict) -> dict[str, Any]:
        """Update application settings."""
        settings_obj = AppSettings.model_validate(settings)
        return self.settings_manager.save(settings_obj).model_dump()

    def update_workspace(self, workspace_path: str) -> dict[str, Any]:
        """Update workspace path."""
        settings = self.settings_manager.load()
        settings.workspace_path = workspace_path
        return self.settings_manager.save(settings).model_dump()

    # ==================== Notes ====================

    def list_notes(self) -> list[dict[str, Any]]:
        """List all notes."""
        notes = self.store.list_notes()
        notes.sort(key=lambda item: (not item.meta.pinned, item.meta.updated_at), reverse=True)
        return [item.model_dump() for item in notes]

    def get_note(self, note_id: str) -> dict[str, Any] | None:
        """Get a single note by ID."""
        note = self.store.get_note(note_id)
        return note.model_dump() if note else None

    def create_note(self, title: str = "Untitled", content: str = None, tags: list[str] = None, default_deck: str = None) -> dict[str, Any]:
        """Create a new note."""
        if content is None:
            content = f"# {title}\n\n"
        note = self.store.create_note(
            title=title,
            content=content,
            tags=tags or [],
            default_deck=default_deck,
        )
        return note.model_dump()

    def save_note(self, note_id: str, content: str, cards: list[dict] = None) -> dict[str, Any]:
        """Save note content and cards."""
        cards_objs = [Card.model_validate(c) for c in (cards or [])]
        note = self.store.save_note(note_id, content, cards_objs)
        return note.model_dump()

    def delete_note(self, note_id: str) -> bool:
        """Delete a note."""
        return self.store.delete_note(note_id)

    def duplicate_note(self, note_id: str) -> dict[str, Any]:
        """Duplicate a note."""
        note = self.store.duplicate_note(note_id)
        return note.model_dump()

    def pin_note(self, note_id: str, pinned: bool) -> dict[str, Any]:
        """Pin or unpin a note."""
        note = self.store.pin_note(note_id, pinned)
        return note.model_dump()

    # ==================== Cards ====================

    def save_card(self, note_id: str, card_id: str, card_data: dict) -> dict[str, Any]:
        """Save a card."""
        card = Card.model_validate(card_data)
        updated_card = self.store.save_card(note_id, card_id, card)
        return updated_card.model_dump()

    def delete_card(self, note_id: str, card_id: str) -> bool:
        """Delete a card."""
        return self.store.delete_card(note_id, card_id)

    # ==================== Coverage ====================

    def get_coverage(self, note_id: str) -> dict[str, Any]:
        """Get coverage analysis for a note."""
        note = self.store.get_note(note_id)
        if not note:
            return {"error": "Note not found"}
        
        anki_cards = []
        try:
            if self.anki_client.is_connected():
                anki_cards = self.anki_client.get_all_library_cards()
        except AnkiConnectError:
            pass
        
        coverage = build_note_coverage(note, anki_cards)
        return coverage.model_dump()

    # ==================== Anki ====================

    def get_anki_decks(self) -> list[str]:
        """Get available Anki decks."""
        try:
            return self.anki_client.get_deck_names()
        except AnkiConnectError as e:
            return {"error": str(e)}

    def push_to_anki(self, note_id: str, cards: list[dict], deck_name: str = None) -> dict[str, Any]:
        """Push cards to Anki."""
        try:
            request = AnkiPushRequest(
                note_id=note_id,
                cards=[Card.model_validate(c) for c in cards],
                deck_name=deck_name,
            )
            result = self.anki_client.push_cards(request)
            return result.model_dump()
        except AnkiConnectError as e:
            return {"error": str(e)}

    def test_anki_connection(self) -> dict[str, Any]:
        """Test AnkiConnect connection."""
        try:
            connected = self.anki_client.is_connected()
            return {"connected": connected}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    # ==================== AI ====================

    def ai_generate_cards(self, note_id: str, count: int = 5, card_type: str = "basic") -> dict[str, Any]:
        """Generate cards using AI."""
        note = self.store.get_note(note_id)
        if not note:
            return {"error": "Note not found"}
        
        try:
            request = AIGenerateCardsRequest(
                note_id=note_id,
                count=count,
                card_type=card_type,
            )
            cards = self.ai_service.generate_cards(request)
            return {"cards": [c.model_dump() for c in cards]}
        except (AIServiceError, AIConfigurationError) as e:
            return {"error": str(e)}

    def ai_explain(self, note_id: str, selection: str) -> dict[str, Any]:
        """Explain text using AI."""
        try:
            request = AIExplainRequest(note_id=note_id, selection=selection)
            result = self.ai_service.explain(request)
            return result.model_dump()
        except (AIServiceError, AIConfigurationError) as e:
            return {"error": str(e)}

    def ai_chat(self, note_id: str, message: str, history: list = None) -> dict[str, Any]:
        """Chat with AI about note content."""
        try:
            request = AIChatRequest(note_id=note_id, message=message, history=history or [])
            result = self.ai_service.chat(request)
            return result.model_dump()
        except (AIServiceError, AIConfigurationError) as e:
            return {"error": str(e)}

    def ai_suggest_for_gaps(self, note_id: str) -> dict[str, Any]:
        """Suggest cards for gaps in coverage."""
        try:
            request = AISuggestCardsForGapsRequest(note_id=note_id)
            cards = self.ai_service.suggest_cards_for_gaps(request)
            return {"cards": [c.model_dump() for c in cards]}
        except (AIServiceError, AIConfigurationError) as e:
            return {"error": str(e)}

    # ==================== Import ====================

    def import_file(self, file_path: str) -> dict[str, Any]:
        """Import a file."""
        try:
            # For webview, we need to handle file selection differently
            # This is a placeholder - actual file handling is in import_file_dialog
            path = Path(file_path)
            if not path.exists():
                return {"error": "File not found"}
            title, content, manifest, data = self.import_service.import_upload_path(path)
            return {
                "title": title,
                "content": content,
                "manifest": manifest,
                "data": data,
            }
        except UnsupportedImportError as e:
            return {"error": str(e)}

    def import_text(self, title: str, text: str) -> dict[str, Any]:
        """Import plain text."""
        title, content, manifest, data = self.import_service.import_text_payload(title, text)
        return {
            "title": title,
            "content": content,
            "manifest": manifest,
            "data": data,
        }

    def import_file_dialog(self) -> dict[str, Any] | None:
        """Open file dialog and import."""
        result = webview.windows[0].create_file_dialog(
            webview.OPEN_DIALOG,
            file_types=("PDF Files (*.pdf)", "PowerPoint Files (*.pptx)", "Markdown Files (*.md)", "Text Files (*.txt)"),
        )
        if result and len(result) > 0:
            return self.import_file(result[0])
        return None

    # ==================== Export ====================

    def export_apkg(self, note_id: str, cards: list[dict], deck_name: str) -> str:
        """Export cards as Anki .apkg file."""
        cards_objs = [Card.model_validate(c) for c in cards]
        path = self.exporter.export_apkg(cards_objs, deck_name)
        return str(path)

    def export_csv(self, note_id: str, cards: list[dict]) -> str:
        """Export cards as CSV."""
        cards_objs = [Card.model_validate(c) for c in cards]
        path = self.exporter.export_csv(cards_objs)
        return str(path)

    # ==================== Utility ====================

    def open_external(self, url: str) -> None:
        """Open URL in external browser."""
        import webbrowser
        webbrowser.open(url)

    def get_version(self) -> str:
        """Get application version."""
        return "0.5.0-standalone"


def get_html() -> str:
    """Load the main HTML template."""
    # In frozen mode, load from bundled assets
    if getattr(sys, "frozen", False):
        base_path = Path(sys._MEIPASS)
        static_path = base_path / "static"
    else:
        # In development, load from source
        base_path = Path(__file__).parent / "src" / "noteforge_anki_studio"
        static_path = base_path / "static"
    
    # Load the template
    template_path = base_path / "templates" / "index.html"
    if template_path.exists():
        return template_path.read_text(encoding="utf-8")
    
    # Fallback to minimal template
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nanki Standalone</title>
</head>
<body>
    <div id="app"></div>
    <script>
        // Check for pywebview API
        function waitForAPI() {
            if (window.pywebview && window.pywebview.api) {
                window.pywebviewReady = true;
                window.dispatchEvent(new Event('pywebviewready'));
            } else {
                setTimeout(waitForAPI, 100);
            }
        }
        waitForAPI();
    </script>
</body>
</html>"""


def main() -> int:
    """Launch the standalone Nanki app."""
    try:
        logger.info("Starting Nanki Standalone...")
        
        # Create API instance
        api = NankiAPI()
        
        # Determine icon path
        if getattr(sys, "frozen", False):
            if sys.platform == "win32":
                icon_path = Path(sys._MEIPASS) / "assets" / "nanki-icon.ico"
            elif sys.platform == "darwin":
                icon_path = Path(sys._MEIPASS) / "assets" / "nanki-icon.icns"
            else:
                icon_path = None
        else:
            base_path = Path(__file__).parent
            if sys.platform == "win32":
                icon_path = base_path / "assets" / "nanki-icon.ico"
            elif sys.platform == "darwin":
                icon_path = base_path / "assets" / "nanki-icon.icns"
            else:
                icon_path = None
        
        # Create window
        window = webview.create_window(
            title="Nanki — Study Workspace",
            html=get_html(),
            js_api=api,
            icon_path=icon_path,
            width=1400,
            height=900,
            min_size=(900, 600),
            resizable=True,
            text_select=True,
            background_color="#0f0f0f",
        )
        
        # Start webview
        webview.start(debug=False)
        
        logger.info("Application exited successfully")
        return 0
        
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())