"""
Nanki Standalone - Desktop App ohne lokalen Server

Diese Version nutzt PyWebView's JavaScript Bridge für direkte Kommunikation
zwischen Frontend und Python-Backend ohne HTTP-Server.
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

# Data directory
if sys.platform == "win32":
    DATA_DIR = Path.home() / "AppData" / "Roaming" / "Nanki"
elif sys.platform == "darwin":
    DATA_DIR = Path.home() / "Library" / "Application Support" / "Nanki"
else:
    DATA_DIR = Path.home() / ".local" / "share" / "nanki"

DATA_DIR.mkdir(parents=True, exist_ok=True)
NOTES_DIR = DATA_DIR / "notes"
NOTES_DIR.mkdir(exist_ok=True)


class NankiAPI:
    """Python API exposed to JavaScript via PyWebView bridge."""

    # ==================== Notes ====================

    def get_notes(self) -> list[dict[str, Any]]:
        """Get all notes."""
        notes = []
        for note_dir in NOTES_DIR.iterdir():
            if note_dir.is_dir():
                note_file = note_dir / "note.md"
                if note_file.exists():
                    notes.append({
                        "id": note_dir.name,
                        "title": note_file.read_text(encoding="utf-8").split("\n")[0].lstrip("# "),
                        "path": str(note_dir),
                    })
        return notes

    def get_note(self, note_id: str) -> dict[str, Any] | None:
        """Get a single note."""
        note_dir = NOTES_DIR / note_id
        if not note_dir.exists():
            return None
        
        note_file = note_dir / "note.md"
        cards_file = note_dir / "cards.json"
        
        content = note_file.read_text(encoding="utf-8") if note_file.exists() else ""
        cards = json.loads(cards_file.read_text(encoding="utf-8")) if cards_file.exists() else []
        
        return {
            "id": note_id,
            "content": content,
            "cards": cards,
        }

    def save_note(self, note_id: str, content: str, cards: list[dict]) -> bool:
        """Save a note."""
        note_dir = NOTES_DIR / note_id
        note_dir.mkdir(exist_ok=True)
        
        (note_dir / "note.md").write_text(content, encoding="utf-8")
        (note_dir / "cards.json").write_text(json.dumps(cards, indent=2), encoding="utf-8")
        return True

    def create_note(self, title: str = "Untitled") -> dict[str, Any]:
        """Create a new note."""
        import uuid
        note_id = str(uuid.uuid4())[:8]
        note_dir = NOTES_DIR / note_id
        note_dir.mkdir(exist_ok=True)
        
        content = f"# {title}\n\n"
        (note_dir / "note.md").write_text(content, encoding="utf-8")
        (note_dir / "cards.json").write_text("[]", encoding="utf-8")
        
        return {"id": note_id, "title": title}

    def delete_note(self, note_id: str) -> bool:
        """Delete a note."""
        import shutil
        note_dir = NOTES_DIR / note_id
        if note_dir.exists():
            shutil.rmtree(note_dir)
            return True
        return False

    # ==================== Anki ====================

    def get_anki_decks(self) -> list[str]:
        """Get available Anki decks (placeholder)."""
        # This would connect to AnkiConnect
        # For now, return empty list
        return []

    def push_to_anki(self, note_id: str, cards: list[dict]) -> dict[str, Any]:
        """Push cards to Anki (placeholder)."""
        # This would use AnkiConnect
        return {"success": True, "pushed": len(cards)}

    # ==================== AI ====================

    def generate_cards(self, text: str, card_type: str = "basic") -> list[dict]:
        """Generate flashcards from text (placeholder)."""
        # This would use Ollama/OpenRouter
        # For now, return simple cards
        sentences = [s.strip() for s in text.split(".") if s.strip()][:3]
        cards = []
        for i, sentence in enumerate(sentences):
            if len(sentence) > 20:
                cards.append({
                    "id": f"auto-{i}",
                    "type": card_type,
                    "front": sentence[:50] + "...?",
                    "back": sentence,
                })
        return cards

    # ==================== File Operations ====================

    def import_file(self, file_path: str) -> dict[str, Any]:
        """Import a file (placeholder)."""
        path = Path(file_path)
        if not path.exists():
            return {"error": "File not found"}
        
        return {
            "filename": path.name,
            "content": path.read_text(encoding="utf-8")[:1000],
        }

    def export_cards(self, note_id: str, format: str = "apkg") -> str:
        """Export cards (placeholder)."""
        return str(NOTES_DIR / note_id / f"export.{format}")


def get_html() -> str:
    """Return the HTML for the standalone app."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nanki Standalone</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f0f;
            color: #ffffff;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { margin-bottom: 20px; color: #a78bfa; }
        .sidebar {
            width: 250px;
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            margin-right: 20px;
        }
        .note-list { list-style: none; }
        .note-list li {
            padding: 10px;
            cursor: pointer;
            border-radius: 4px;
            margin-bottom: 5px;
        }
        .note-list li:hover { background: #2a2a2a; }
        .note-list li.active { background: #3b82f6; }
        .editor {
            flex: 1;
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
        }
        textarea {
            width: 100%;
            height: 300px;
            background: #0f0f0f;
            color: #fff;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 10px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
        }
        .toolbar {
            margin-bottom: 15px;
            display: flex;
            gap: 10px;
        }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover { background: #2563eb; }
        button.secondary { background: #4b5563; }
        button.secondary:hover { background: #6b7280; }
        .cards {
            margin-top: 20px;
            padding: 15px;
            background: #1a1a1a;
            border-radius: 8px;
        }
        .card {
            background: #0f0f0f;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 3px solid #a78bfa;
        }
        .status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a1a;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 12px;
            color: #6b7280;
        }
        .main { display: flex; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Nanki Standalone</h1>
        <div class="main">
            <div class="sidebar">
                <div class="toolbar">
                    <button onclick="createNote()">+ New Note</button>
                </div>
                <ul class="note-list" id="noteList"></ul>
            </div>
            <div class="editor">
                <div class="toolbar">
                    <button onclick="saveNote()">Save</button>
                    <button onclick="generateCards()" class="secondary">Generate Cards</button>
                </div>
                <input type="hidden" id="currentNoteId" value="">
                <h2 id="noteTitle" contenteditable="true">Select or create a note</h2>
                <textarea id="editor" placeholder="Write your note here..."></textarea>
                <div class="cards" id="cardsContainer">
                    <h3>Cards</h3>
                    <div id="cardsList"></div>
                </div>
            </div>
        </div>
    </div>
    <div class="status" id="status">Ready</div>

    <script>
        let notes = [];

        async function loadNotes() {
            notes = await pywebview.api.get_notes();
            renderNoteList();
        }

        function renderNoteList() {
            const list = document.getElementById('noteList');
            list.innerHTML = notes.map(n => 
                '<li onclick="loadNote(\\'' + n.id + '\\')">' + n.title + '</li>'
            ).join('');
        }

        async function createNote() {
            const result = await pywebview.api.create_note('New Note');
            notes.push(result);
            renderNoteList();
            loadNote(result.id);
            setStatus('Note created');
        }

        async function loadNote(noteId) {
            const note = await pywebview.api.get_note(noteId);
            if (note) {
                document.getElementById('currentNoteId').value = noteId;
                document.getElementById('editor').value = note.content;
                document.getElementById('noteTitle').textContent = 
                    note.content.split('\\n')[0].replace(/^#+\\s*/, '') || 'Untitled';
                renderCards(note.cards);
                setStatus('Note loaded');
            }
        }

        async function saveNote() {
            const noteId = document.getElementById('currentNoteId').value;
            if (!noteId) {
                alert('No note selected');
                return;
            }
            const content = document.getElementById('editor').value;
            // Get cards from somewhere
            const cards = [];
            await pywebview.api.save_note(noteId, content, cards);
            setStatus('Note saved');
        }

        async function generateCards() {
            const content = document.getElementById('editor').value;
            const cards = await pywebview.api.generate_cards(content, 'basic');
            renderCards(cards);
            setStatus('Generated ' + cards.length + ' cards');
        }

        function renderCards(cards) {
            const list = document.getElementById('cardsList');
            list.innerHTML = cards.map(c => 
                '<div class="card"><strong>' + c.front + '</strong><br>' + 
                (c.back || '') + '</div>'
            ).join('');
        }

        function setStatus(message) {
            document.getElementById('status').textContent = message;
        }

        // Initialize
        window.addEventListener('pywebviewready', loadNotes);
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
        icon_path = None
        if getattr(sys, "frozen", False):
            if sys.platform == "win32":
                icon_path = Path(sys._MEIPASS) / "assets" / "nanki-icon.ico"
            elif sys.platform == "darwin":
                icon_path = Path(sys._MEIPASS) / "assets" / "nanki-icon.icns"
        
        # Create window
        window = webview.create_window(
            title="Nanki Standalone",
            html=get_html(),
            js_api=api,
            icon_path=icon_path,
            width=1400,
            height=900,
            min_size=(900, 600),
            resizable=True,
            text_select=True,
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