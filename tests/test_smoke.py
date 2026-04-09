from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

import fitz
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from noteforge_anki_studio.anki_connect import AnkiLibraryCard
from noteforge_anki_studio.app import ai_service, anki_client, app


client = TestClient(app)


@pytest.fixture(autouse=True)
def stub_anki_library(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _empty_library(*args, **kwargs):
        return []

    monkeypatch.setattr(anki_client, "fetch_all_cards_for_coverage", _empty_library)


def test_create_note_and_card_and_exports() -> None:
    response = client.post(
        "/api/notes",
        json={
            "title": "Smoke Test",
            "content": "# Smoke\n\nhello",
            "tags": ["test"],
            "default_deck": "Default",
        },
    )
    assert response.status_code == 200
    note = response.json()
    note_id = note["meta"]["id"]

    response = client.post(
        f"/api/notes/{note_id}/cards",
        json={
            "type": "basic",
            "front": "Q",
            "back": "A",
            "tags": ["x"],
            "deck_name": "Default",
            "source_locator": "Page 1",
        },
    )
    assert response.status_code == 200

    response = client.post(f"/api/notes/{note_id}/cards/export/csv")
    assert response.status_code == 200
    assert response.json()["filename"].endswith(".csv")

    response = client.post(f"/api/notes/{note_id}/cards/export/anki-txt")
    assert response.status_code == 200
    assert response.json()["filename"].endswith(".txt")

    response = client.post(f"/api/notes/{note_id}/cards/export/apkg")
    assert response.status_code == 200
    assert response.json()["filename"].endswith(".apkg")


def test_import_pdf_and_pptx() -> None:
    pdf_doc = fitz.open()
    page = pdf_doc.new_page()
    page.insert_text((72, 72), "hello pdf")
    response = client.post(
        "/api/import/file",
        files={"file": ("sample.pdf", pdf_doc.tobytes(), "application/pdf")},
    )
    assert response.status_code == 200
    assert response.json()["source"]["source_type"] == "pdf"

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", "")
        archive.writestr(
            "ppt/slides/slide1.xml",
            '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide title</a:t></a:r></a:p>'
            '</p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
        )
    response = client.post(
        "/api/import/file",
        files={
            "file": (
                "slides.pptx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["source"]["source_type"] == "pptx"


def test_note_coverage_endpoint_maps_cards_and_sections() -> None:
    response = client.post(
        "/api/notes",
        json={
            "title": "Coverage Test",
            "content": "# Intro\n\nCell membrane controls transport.\n\n## Details\n\nATP powers active transport.",
            "tags": [],
            "default_deck": "Default",
        },
    )
    assert response.status_code == 200
    note_id = response.json()["meta"]["id"]

    start = response.json()["content"].index("Cell membrane")
    end = start + len("Cell membrane controls transport")
    response = client.post(
        f"/api/notes/{note_id}/cards",
        json={
            "type": "basic",
            "front": "What controls transport?",
            "back": "Cell membrane",
            "source_excerpt": "Cell membrane controls transport",
            "source_locator": "Intro",
            "coverage_anchor": {
                "source": "editor",
                "selected_text": "Cell membrane controls transport",
                "raw_start": start,
                "raw_end": end,
            },
        },
    )
    assert response.status_code == 200

    response = client.get(f"/api/notes/{note_id}/coverage")
    assert response.status_code == 200
    payload = response.json()
    assert payload["stats"]["mapped_cards"] == 1
    assert payload["stats"]["coverage_percent"] > 0
    assert any(section["title"] == "Intro" for section in payload["sections"])
    assert "coverage-token covered" in payload["coverage_html"]
    assert payload["anki"]["available"] is True
    assert payload["anki"]["total_cards"] == 0


def test_coverage_fallback_uses_source_excerpt_for_legacy_cards() -> None:
    response = client.post(
        "/api/notes",
        json={
            "title": "Legacy Coverage",
            "content": "# Legacy\n\nMitochondria produce ATP for the cell.",
            "tags": [],
            "default_deck": "Default",
        },
    )
    assert response.status_code == 200
    note_id = response.json()["meta"]["id"]

    response = client.post(
        f"/api/notes/{note_id}/cards",
        json={
            "type": "basic",
            "front": "Organelle?",
            "back": "Mitochondria",
            "source_excerpt": "Mitochondria produce ATP",
            "source_locator": "Legacy",
        },
    )
    assert response.status_code == 200

    response = client.get(f"/api/notes/{note_id}/coverage")
    assert response.status_code == 200
    payload = response.json()
    assert payload["stats"]["mapped_cards"] == 1
    assert payload["cards"][0]["method"].startswith("fallback")


def test_coverage_includes_matching_cards_from_anki_library(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _anki_cards(*args, **kwargs):
        return [
            AnkiLibraryCard(
                id="anki:123",
                note_id="500",
                model_name="Basic",
                deck_name="Biology",
                type="basic",
                front="What controls transport?",
                back="Cell membrane controls transport",
            ),
            AnkiLibraryCard(
                id="anki:124",
                note_id="501",
                model_name="Basic",
                deck_name="History",
                type="basic",
                front="Who was Caesar?",
                back="Roman general",
            ),
        ]

    monkeypatch.setattr(anki_client, "fetch_all_cards_for_coverage", _anki_cards)

    response = client.post(
        "/api/notes",
        json={
            "title": "Anki Coverage",
            "content": "# Intro\n\nCell membrane controls transport across the membrane.",
            "tags": [],
            "default_deck": "Default",
        },
    )
    assert response.status_code == 200
    note_id = response.json()["meta"]["id"]

    response = client.get(f"/api/notes/{note_id}/coverage")
    assert response.status_code == 200
    payload = response.json()
    assert payload["stats"]["anki_total_cards"] == 2
    assert payload["stats"]["anki_matched_cards"] == 1
    assert any(card["origin"] == "anki" for card in payload["cards"])
    assert payload["anki"]["matched_cards"] == 1


def test_settings_update_supports_language_and_anki_fields() -> None:
    response = client.get("/api/settings")
    assert response.status_code == 200
    settings = response.json()

    settings["language"] = "de"
    settings["anki_url"] = "http://127.0.0.1:8765"
    settings["auto_sync"] = True

    response = client.put("/api/settings", json=settings)
    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == "de"
    assert payload["anki_url"] == "http://127.0.0.1:8765"
    assert payload["auto_sync"] is True



def test_convert_html_endpoint_returns_markdown() -> None:
    response = client.post("/api/convert-html", json={"html": "<h1>Title</h1><p><strong>Bold</strong> text</p><ul><li>One</li><li>Two</li></ul>"})
    assert response.status_code == 200
    markdown = response.json()["markdown"]
    assert markdown.startswith("# Title")
    assert "**Bold**" in markdown
    assert "- One" in markdown


def test_index_contains_notes_first_ui_controls() -> None:
    response = client.get('/')
    assert response.status_code == 200
    html = response.text
    assert 'id="quick-card-dock"' in html
    assert 'id="toggle-coverage-view-btn"' in html
    assert 'id="editor-coverage-view"' in html


def test_settings_include_ai_defaults() -> None:
    response = client.get("/api/settings")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ai"]["provider"] == "ollama_local"
    assert "flashcards" in payload["ai"]["prompts"]


def test_ai_endpoints_can_be_stubbed(monkeypatch: pytest.MonkeyPatch) -> None:
    response = client.post(
        "/api/notes",
        json={
            "title": "AI Test",
            "content": "# AI\n\nAlpha and beta are important.",
            "tags": [],
            "default_deck": "Default",
        },
    )
    assert response.status_code == 200
    note_id = response.json()["meta"]["id"]

    async def _list_models(*args, **kwargs):
        return {
            "provider": "ollama_local",
            "base_url": "http://127.0.0.1:11434",
            "models": [{"id": "llama3", "name": "llama3", "provider": "ollama_local"}],
            "count": 1,
        }

    async def _test(*args, **kwargs):
        return {
            "provider": "ollama_local",
            "base_url": "http://127.0.0.1:11434",
            "models": [{"id": "llama3", "name": "llama3", "provider": "ollama_local"}],
            "count": 1,
            "ok": True,
            "default_model": "llama3",
        }

    async def _chat(*args, **kwargs):
        return {"provider": "ollama_local", "model": "llama3", "content": "Antwort"}

    async def _explain(*args, **kwargs):
        return {"provider": "ollama_local", "model": "llama3", "content": "Erklärung"}

    async def _generate(*args, **kwargs):
        return {
            "provider": "ollama_local",
            "model": "llama3",
            "cards": [{"type": "basic", "front": "Was?", "back": "Alpha", "extra": "", "tags": [], "source_excerpt": "Alpha"}],
            "total_local_cards": 0,
            "total_anki_cards_scanned": 12,
            "relevant_anki_cards_shared": 3,
            "note_only": True,
        }

    monkeypatch.setattr(ai_service, "list_models", _list_models)
    monkeypatch.setattr(ai_service, "test_connection", _test)
    monkeypatch.setattr(ai_service, "chat", _chat)
    monkeypatch.setattr(ai_service, "explain", _explain)
    monkeypatch.setattr(ai_service, "generate_cards", _generate)

    response = client.post("/api/ai/test")
    assert response.status_code == 200
    assert response.json()["default_model"] == "llama3"

    response = client.get("/api/ai/models")
    assert response.status_code == 200
    assert response.json()["count"] == 1

    response = client.post(
        "/api/ai/chat",
        json={"note_id": note_id, "context_text": "Alpha", "messages": [{"role": "user", "content": "Erkläre Alpha"}]},
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Antwort"

    response = client.post(
        "/api/ai/explain",
        json={"note_id": note_id, "selected_text": "Alpha"},
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Erklärung"

    response = client.post(
        "/api/ai/generate-cards",
        json={"note_id": note_id, "source_text": "Alpha and beta", "target_count": 4},
    )
    assert response.status_code == 200
    assert response.json()["total_anki_cards_scanned"] == 12
    assert response.json()["cards"][0]["front"] == "Was?"
