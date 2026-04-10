"""Extended importers for multiple deck sources."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
import requests

from .models import Card, CardType, NoteMetadata
from .storage import utc_now_iso


class QuizletImporter:
    """Import flashcards from Quizlet."""
    
    def __init__(self):
        self.base_url = "https://quizlet.com/webapi/3.2/flashcards"
    
    def can_import(self, url: str) -> bool:
        """Check if URL is a Quizlet deck."""
        return bool(re.match(r'https?://quizlet\.com/[^/]+/[^/]+', url))
    
    def import_from_url(self, url: str) -> dict:
        """Import cards from Quizlet URL."""
        # Extract deck ID from URL
        match = re.search(r'/([^/]+)/?$', url)
        if not match:
            raise ValueError("Invalid Quizlet URL")
        
        deck_name = match.group(1).replace('-', ' ').title()
        
        # Note: Quizlet scraping requires browser automation
        # This is a placeholder for the actual implementation
        return {
            "title": f"Imported from Quizlet: {deck_name}",
            "cards": [],
            "source": "quizlet",
            "url": url,
        }


class AnkiWebImporter:
    """Import from AnkiWeb shared decks."""
    
    def can_import(self, url: str) -> bool:
        """Check if URL is AnkiWeb deck."""
        return 'ankiweb.net' in url or 'ankiweb.net/shared/info' in url
    
    def import_from_url(self, url: str) -> dict:
        """Import from AnkiWeb."""
        # Extract deck ID
        match = re.search(r'info/(\d+)', url)
        if not match:
            raise ValueError("Invalid AnkiWeb URL")
        
        deck_id = match.group(1)
        
        return {
            "title": f"Imported from AnkiWeb (ID: {deck_id})",
            "cards": [],
            "source": "ankiweb",
            "url": url,
        }


class CSVImporter:
    """Import from CSV/TSV files."""
    
    def import_from_file(self, file_path: Path, delimiter: str = ',') -> dict:
        """Import cards from CSV file."""
        import csv
        
        cards = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter=delimiter)
            for i, row in enumerate(reader):
                if len(row) >= 2:
                    cards.append({
                        "front": row[0],
                        "back": row[1],
                        "tags": row[2:] if len(row) > 2 else [],
                    })
        
        return {
            "title": f"Imported from {file_path.name}",
            "cards": cards,
            "source": "csv",
            "count": len(cards),
        }


class ImportManager:
    """Central manager for all import sources."""
    
    SOURCES = [
        {"id": "quizlet", "name": "Quizlet", "icon": "🔗"},
        {"id": "ankiweb", "name": "AnkiWeb", "icon": "🧠"},
        {"id": "csv", "name": "CSV/TSV File", "icon": "📊"},
        {"id": "json", "name": "JSON Export", "icon": "📋"},
        {"id": "markdown", "name": "Markdown", "icon": "📝"},
    ]
    
    def __init__(self):
        self.quizlet = QuizletImporter()
        self.ankiweb = AnkiWebImporter()
        self.csv = CSVImporter()
    
    def get_available_sources(self) -> list[dict]:
        """Get list of available import sources."""
        return self.SOURCES
    
    def import_from_url(self, url: str, source_type: str) -> dict:
        """Import from specific source."""
        if source_type == 'quizlet':
            return self.quizlet.import_from_url(url)
        elif source_type == 'ankiweb':
            return self.ankiweb.import_from_url(url)
        else:
            raise ValueError(f"Unknown source type: {source_type}")
    
    def detect_source(self, url: str) -> str | None:
        """Auto-detect source from URL."""
        if self.quizlet.can_import(url):
            return 'quizlet'
        elif self.ankiweb.can_import(url):
            return 'ankiweb'
        return None
