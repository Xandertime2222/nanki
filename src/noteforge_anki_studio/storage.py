from __future__ import annotations

import json
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from .config import SettingsManager
from .models import Card, NoteDocument, NoteListItem, NoteMetadata, SourceManifest

FRONTMATTER_PATTERN = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)
NOTE_FILENAME = "note.md"
CARDS_FILENAME = "cards.json"
SOURCE_FILENAME = "source-manifest.json"
SOURCE_DIRNAME = "source"
EXPORTS_DIRNAME = "exports"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in tags:
        tag = raw.strip().replace(" ", "-")
        if tag and tag not in seen:
            cleaned.append(tag)
            seen.add(tag)
    return cleaned


class WorkspaceStore:
    def __init__(self, settings_manager: SettingsManager) -> None:
        self.settings_manager = settings_manager

    @property
    def workspace_path(self) -> Path:
        return Path(self.settings_manager.load().workspace_path)

    @property
    def notes_root(self) -> Path:
        root = self.workspace_path / "notes"
        root.mkdir(parents=True, exist_ok=True)
        return root

    @property
    def exports_root(self) -> Path:
        root = self.workspace_path / EXPORTS_DIRNAME
        root.mkdir(parents=True, exist_ok=True)
        return root

    def note_dir(self, note_id: str) -> Path:
        path = self.notes_root / note_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def note_path(self, note_id: str) -> Path:
        return self.note_dir(note_id) / NOTE_FILENAME

    def cards_path(self, note_id: str) -> Path:
        return self.note_dir(note_id) / CARDS_FILENAME

    def source_manifest_path(self, note_id: str) -> Path:
        return self.note_dir(note_id) / SOURCE_FILENAME

    def source_dir(self, note_id: str) -> Path:
        path = self.note_dir(note_id) / SOURCE_DIRNAME
        path.mkdir(parents=True, exist_ok=True)
        return path

    def parse_markdown_file(self, path: Path) -> tuple[dict[str, Any], str]:
        raw = path.read_text(encoding="utf-8")
        match = FRONTMATTER_PATTERN.match(raw)
        if not match:
            return {}, raw
        frontmatter = yaml.safe_load(match.group(1)) or {}
        body = raw[match.end() :]
        return frontmatter, body

    def dump_markdown_file(self, meta: dict[str, Any], content: str) -> str:
        frontmatter = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True).strip()
        return f"---\n{frontmatter}\n---\n\n{content.rstrip()}\n"

    def list_notes(self) -> list[NoteListItem]:
        notes: list[NoteListItem] = []
        for note_dir in sorted(self.notes_root.glob("*")):
            note_path = note_dir / NOTE_FILENAME
            if not note_path.exists():
                continue
            try:
                note = self.load_note(note_dir.name)
            except Exception:
                continue
            word_count = len(re.findall(r"\b\w+\b", note.content))
            notes.append(
                NoteListItem(
                    meta=note.meta,
                    card_count=len(note.cards),
                    word_count=word_count,
                )
            )
        return sorted(
            notes,
            key=lambda item: (not item.meta.pinned, item.meta.updated_at, item.meta.title.lower()),
            reverse=True,
        )

    def create_note(
        self,
        title: str,
        content: str = "",
        tags: list[str] | None = None,
        source_type: str = "markdown",
        original_filename: str | None = None,
        default_deck: str = "Default",
        source: SourceManifest | None = None,
    ) -> NoteDocument:
        note_id = uuid.uuid4().hex[:12]
        timestamp = utc_now_iso()
        meta = NoteMetadata(
            id=note_id,
            title=title.strip() or "Untitled note",
            tags=normalize_tags(tags or []),
            pinned=False,
            created_at=timestamp,
            updated_at=timestamp,
            source_type=source_type,
            original_filename=original_filename,
            default_deck=default_deck or "Default",
            folder_name=note_id,
        )
        note = NoteDocument(meta=meta, content=content, cards=[], source=source)
        self.save_note_document(note)
        return note

    def duplicate_note(self, note_id: str, title: str | None = None) -> NoteDocument:
        original = self.load_note(note_id)
        duplicate = self.create_note(
            title=title or f"{original.meta.title} (Copy)",
            content=original.content,
            tags=list(original.meta.tags),
            source_type=original.meta.source_type,
            original_filename=original.meta.original_filename,
            default_deck=original.meta.default_deck,
            source=original.source,
        )
        copied_cards = [
            card.model_copy(update={"id": uuid.uuid4().hex[:12], "created_at": utc_now_iso(), "updated_at": utc_now_iso()})
            for card in original.cards
        ]
        self.save_cards(duplicate.meta.id, copied_cards)
        return self.load_note(duplicate.meta.id)

    def save_note_document(self, note: NoteDocument) -> NoteDocument:
        meta_dict = note.meta.model_dump()
        meta_dict["tags"] = normalize_tags(meta_dict.get("tags", []))
        meta_dict["updated_at"] = utc_now_iso()
        note.meta = NoteMetadata.model_validate(meta_dict)
        self.note_path(note.meta.id).write_text(
            self.dump_markdown_file(meta_dict, note.content),
            encoding="utf-8",
        )
        self.save_cards(note.meta.id, note.cards)
        if note.source:
            self.save_source_manifest(note.meta.id, note.source)
        return note

    def save_note_fields(
        self,
        note_id: str,
        *,
        title: str,
        tags: list[str],
        pinned: bool,
        content: str,
        default_deck: str,
    ) -> NoteDocument:
        existing = self.load_note(note_id)
        existing.meta.title = title.strip() or existing.meta.title
        existing.meta.tags = normalize_tags(tags)
        existing.meta.pinned = pinned
        existing.meta.default_deck = default_deck or "Default"
        existing.content = content
        return self.save_note_document(existing)

    def load_note(self, note_id: str) -> NoteDocument:
        note_path = self.note_path(note_id)
        if not note_path.exists():
            raise FileNotFoundError(f"Note {note_id} not found")
        frontmatter, content = self.parse_markdown_file(note_path)
        frontmatter.setdefault("id", note_id)
        frontmatter.setdefault("title", note_id)
        frontmatter.setdefault("tags", [])
        frontmatter.setdefault("pinned", False)
        frontmatter.setdefault("created_at", utc_now_iso())
        frontmatter.setdefault("updated_at", frontmatter["created_at"])
        frontmatter.setdefault("source_type", "markdown")
        frontmatter.setdefault("default_deck", "Default")
        frontmatter.setdefault("folder_name", note_id)
        meta = NoteMetadata.model_validate(frontmatter)
        cards = self.load_cards(note_id)
        source = self.load_source_manifest(note_id)
        return NoteDocument(meta=meta, content=content, cards=cards, source=source)

    def delete_note(self, note_id: str) -> None:
        note_dir = self.note_dir(note_id)
        if note_dir.exists():
            shutil.rmtree(note_dir)

    def load_cards(self, note_id: str) -> list[Card]:
        path = self.cards_path(note_id)
        if not path.exists():
            return []
        payload = json.loads(path.read_text(encoding="utf-8"))
        cards = payload.get("cards", [])
        return [Card.model_validate(card) for card in cards]

    def save_cards(self, note_id: str, cards: list[Card]) -> list[Card]:
        path = self.cards_path(note_id)
        normalized = [Card.model_validate(card.model_dump()) for card in cards]
        path.write_text(
            json.dumps({"note_id": note_id, "cards": [card.model_dump() for card in normalized]}, indent=2),
            encoding="utf-8",
        )
        return normalized

    def upsert_card(self, note_id: str, card: Card) -> Card:
        cards = self.load_cards(note_id)
        now = utc_now_iso()
        existing_index = next((index for index, item in enumerate(cards) if item.id == card.id), None)
        if existing_index is None:
            card.created_at = card.created_at or now
            card.updated_at = now
            cards.append(card)
        else:
            card.created_at = cards[existing_index].created_at
            card.updated_at = now
            cards[existing_index] = card
        self.save_cards(note_id, cards)
        note = self.load_note(note_id)
        note.meta.updated_at = now
        self.save_note_document(note)
        return card

    def delete_card(self, note_id: str, card_id: str) -> None:
        cards = [card for card in self.load_cards(note_id) if card.id != card_id]
        self.save_cards(note_id, cards)
        note = self.load_note(note_id)
        note.meta.updated_at = utc_now_iso()
        self.save_note_document(note)

    def load_source_manifest(self, note_id: str) -> SourceManifest | None:
        path = self.source_manifest_path(note_id)
        if not path.exists():
            return None
        return SourceManifest.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def save_source_manifest(self, note_id: str, manifest: SourceManifest) -> SourceManifest:
        path = self.source_manifest_path(note_id)
        path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
        return manifest

    def save_source_file(self, note_id: str, filename: str, data: bytes) -> str:
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
        target = self.source_dir(note_id) / safe_name
        target.write_bytes(data)
        return safe_name

    def get_source_file_path(self, note_id: str, filename: str) -> Path:
        target = self.source_dir(note_id) / filename
        if not target.exists():
            raise FileNotFoundError(filename)
        return target

    def export_path(self, note_id: str, suffix: str) -> Path:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        note_title = self.load_note(note_id).meta.title
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", note_title.lower()).strip("-") or note_id
        return self.exports_root / f"{slug}-{timestamp}{suffix}"
