"""Tests for Notes and Cards CRUD endpoints."""
import pytest
from fastapi.testclient import TestClient
from nanki_core.app import app

client = TestClient(app)


def test_list_notes():
    """Test GET /api/notes endpoint."""
    response = client.get("/api/notes")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_note():
    """Test GET /api/notes/{note_id} endpoint."""
    # Get list first to find a valid note_id
    list_response = client.get("/api/notes")
    notes = list_response.json()
    if notes:
        note_id = notes[0]["meta"]["id"]
        response = client.get(f"/api/notes/{note_id}")
        assert response.status_code == 200
        data = response.json()
        assert "meta" in data
        assert "cards" in data


def test_get_note_not_found():
    """Test GET /api/notes/{note_id} with invalid ID."""
    response = client.get("/api/notes/invalid123")
    assert response.status_code == 404


def test_create_note():
    """Test POST /api/notes endpoint."""
    payload = {
        "title": "Test Note from API",
        "content": "# Test\n\nThis is a test note.",
        "tags": ["test", "api"],
        "default_deck": "TestDeck"
    }
    response = client.post("/api/notes", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["title"] == "Test Note from API"
    assert data["meta"]["tags"] == ["test", "api"]
    assert "id" in data["meta"]
    
    # Cleanup
    note_id = data["meta"]["id"]
    client.delete(f"/api/notes/{note_id}")


def test_update_note():
    """Test PUT /api/notes/{note_id} endpoint."""
    # Create a note first
    create_payload = {
        "title": "Update Test",
        "content": "# Original"
    }
    create_response = client.post("/api/notes", json=create_payload)
    note_id = create_response.json()["meta"]["id"]
    
    # Update it
    update_payload = {
        "title": "Updated Title",
        "content": "# Updated content",
        "tags": ["updated"],
        "pinned": True
    }
    response = client.put(f"/api/notes/{note_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["title"] == "Updated Title"
    assert data["meta"]["pinned"] is True
    
    # Cleanup
    client.delete(f"/api/notes/{note_id}")


def test_duplicate_note():
    """Test POST /api/notes/{note_id}/duplicate endpoint."""
    # Create a note first
    create_payload = {
        "title": "Duplicate Source",
        "content": "# Source"
    }
    create_response = client.post("/api/notes", json=create_payload)
    note_id = create_response.json()["meta"]["id"]
    
    # Duplicate it
    dup_payload = {"new_title": "Duplicated Note"}
    response = client.post(f"/api/notes/{note_id}/duplicate", json=dup_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["title"] == "Duplicated Note"
    assert data["meta"]["id"] != note_id
    
    # Cleanup
    client.delete(f"/api/notes/{note_id}")
    client.delete(f"/api/notes/{data['meta']['id']}")


def test_delete_note():
    """Test DELETE /api/notes/{note_id} endpoint."""
    # Create a note first
    create_payload = {
        "title": "Delete Test",
        "content": "# To be deleted"
    }
    create_response = client.post("/api/notes", json=create_payload)
    note_id = create_response.json()["meta"]["id"]
    
    # Delete it
    response = client.delete(f"/api/notes/{note_id}")
    assert response.status_code == 200
    
    # Verify it's gone
    get_response = client.get(f"/api/notes/{note_id}")
    assert get_response.status_code == 404


def test_create_card():
    """Test POST /api/notes/{note_id}/cards endpoint."""
    # Create a note first
    create_payload = {"title": "Card Test Note"}
    create_response = client.post("/api/notes", json=create_payload)
    note_id = create_response.json()["meta"]["id"]
    
    # Create a card
    card_payload = {
        "type": "basic",
        "front": "What is Python?",
        "back": "A programming language",
        "tags": ["python", "programming"]
    }
    response = client.post(f"/api/notes/{note_id}/cards", json=card_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "basic"
    assert data["front"] == "What is Python?"
    assert data["back"] == "A programming language"
    assert "id" in data
    
    # Cleanup
    client.delete(f"/api/notes/{note_id}")


def test_update_card():
    """Test PUT /api/notes/{note_id}/cards/{card_id} endpoint."""
    # Create a note with a card
    note_payload = {"title": "Card Update Test"}
    note_response = client.post("/api/notes", json=note_payload)
    note_id = note_response.json()["meta"]["id"]
    
    card_payload = {
        "type": "basic",
        "front": "Original question",
        "back": "Original answer"
    }
    card_response = client.post(f"/api/notes/{note_id}/cards", json=card_payload)
    card_id = card_response.json()["id"]
    
    # Update the card
    update_payload = {
        "type": "reverse",
        "front": "Updated question",
        "back": "Updated answer",
        "tags": ["updated"]
    }
    response = client.put(f"/api/notes/{note_id}/cards/{card_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "reverse"
    assert data["front"] == "Updated question"
    
    # Cleanup
    client.delete(f"/api/notes/{note_id}")


def test_delete_card():
    """Test DELETE /api/notes/{note_id}/cards/{card_id} endpoint."""
    # Create a note with a card
    note_payload = {"title": "Card Delete Test"}
    note_response = client.post("/api/notes", json=note_payload)
    note_id = note_response.json()["meta"]["id"]
    
    card_payload = {
        "type": "basic",
        "front": "To be deleted",
        "back": "Gone soon"
    }
    card_response = client.post(f"/api/notes/{note_id}/cards", json=card_payload)
    card_id = card_response.json()["id"]
    
    # Delete the card
    response = client.delete(f"/api/notes/{note_id}/cards/{card_id}")
    assert response.status_code == 200
    
    # Cleanup
    client.delete(f"/api/notes/{note_id}")
