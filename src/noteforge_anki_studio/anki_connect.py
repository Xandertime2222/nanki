from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Iterable

import httpx

from .config import SettingsManager
from .models import Card, NoteDocument


class AnkiConnectError(RuntimeError):
    pass


@dataclass
class AnkiPushResult:
    pushed: list[dict[str, Any]]
    skipped: list[dict[str, Any]]
    sync_triggered: bool = False
    version: int | None = None


@dataclass(slots=True)
class AnkiLibraryCard:
    id: str
    note_id: str | None
    model_name: str
    deck_name: str
    type: str
    front: str
    back: str
    extra: str = ""
    tags: list[str] = field(default_factory=list)
    source_excerpt: str = ""
    source_locator: str = ""
    coverage_anchor: None = None
    origin: str = "anki"


class AnkiConnectClient:
    def __init__(self, settings_manager: SettingsManager) -> None:
        self.settings_manager = settings_manager
        self._version_cache: int | None = None
        self._library_cache: tuple[float, list[AnkiLibraryCard]] | None = None
        self._cached_url: str | None = None

    @property
    def base_url(self) -> str:
        return self.settings_manager.load().anki_url

    def _sync_endpoint_state(self) -> None:
        url = self.base_url
        if self._cached_url == url:
            return
        self._cached_url = url
        self._version_cache = None
        self._library_cache = None

    async def _post_raw(self, payload: dict[str, Any]) -> Any:
        self._sync_endpoint_state()
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(self.base_url, json=payload)
            response.raise_for_status()
            try:
                return response.json()
            except ValueError:
                return response.text

    async def detect_version(self) -> int:
        self._sync_endpoint_state()
        if self._version_cache is not None:
            return self._version_cache
        last_error: Exception | None = None
        for requested in (6, 5, 4):
            try:
                raw = await self._post_raw({"action": "version", "version": requested})
                if isinstance(raw, dict):
                    if raw.get("error"):
                        raise AnkiConnectError(str(raw["error"]))
                    result = raw.get("result")
                else:
                    result = raw
                if isinstance(result, int):
                    self._version_cache = result
                    return result
                if isinstance(result, str) and result.isdigit():
                    self._version_cache = int(result)
                    return self._version_cache
            except Exception as exc:  # pragma: no cover - defensive for local Anki state
                last_error = exc
        raise AnkiConnectError(f"Could not negotiate AnkiConnect version: {last_error}")

    async def invoke(self, action: str, params: dict[str, Any] | None = None) -> Any:
        version = await self.detect_version()
        raw = await self._post_raw({"action": action, "version": version, "params": params or {}})
        if isinstance(raw, dict):
            if raw.get("error"):
                raise AnkiConnectError(str(raw["error"]))
            if "result" not in raw:
                raise AnkiConnectError("AnkiConnect response did not include a result field")
            return raw["result"]
        return raw

    async def test_connection(self) -> dict[str, Any]:
        version = await self.detect_version()
        decks = await self.invoke("deckNames")
        models = await self.invoke("modelNames")
        return {"version": version, "decks": decks, "models": models, "url": self.base_url}

    async def deck_names(self) -> list[str]:
        result = await self.invoke("deckNames")
        return list(result)

    async def model_names(self) -> list[str]:
        result = await self.invoke("modelNames")
        return list(result)

    async def ensure_deck(self, deck_name: str) -> None:
        await self.invoke("createDeck", {"deck": deck_name})

    def invalidate_library_cache(self) -> None:
        self._library_cache = None

    def _card_to_anki_note(self, note: NoteDocument, card: Card, override_deck: str | None = None) -> dict[str, Any]:
        tags = sorted({*note.meta.tags, *card.tags, "nanki", f"nanki-note-{note.meta.id}"})
        deck_name = override_deck or card.deck_name or note.meta.default_deck or "Default"
        if card.type == "cloze":
            text = card.front if "{{c" in card.front else f"{{{{c1::{card.front}}}}}"
            extra = card.extra or card.back
            model_name = "Cloze"
            fields = {"Text": text, "Extra": extra}
        elif card.type == "reverse":
            model_name = "Basic (and reversed card)"
            fields = {"Front": card.front, "Back": card.back}
        else:
            model_name = "Basic"
            fields = {"Front": card.front, "Back": card.back}
        return {
            "deckName": deck_name,
            "modelName": model_name,
            "fields": fields,
            "tags": tags,
        }

    async def push_cards(
        self,
        note: NoteDocument,
        cards: list[Card],
        *,
        override_deck: str | None = None,
        sync_after_push: bool = False,
    ) -> AnkiPushResult:
        if not cards:
            return AnkiPushResult(pushed=[], skipped=[], version=await self.detect_version())
        candidate_notes = [self._card_to_anki_note(note, card, override_deck) for card in cards]
        for candidate in candidate_notes:
            await self.ensure_deck(candidate["deckName"])
        can_add = await self.invoke("canAddNotes", {"notes": candidate_notes})
        skipped: list[dict[str, Any]] = []
        accepted_notes: list[dict[str, Any]] = []
        accepted_cards: list[Card] = []
        for card, candidate, allowed in zip(cards, candidate_notes, can_add, strict=False):
            if allowed:
                accepted_notes.append(candidate)
                accepted_cards.append(card)
            else:
                skipped.append(
                    {
                        "card_id": card.id,
                        "reason": "Anki rejected the card before creation (duplicate or invalid fields).",
                    }
                )
        pushed: list[dict[str, Any]] = []
        if accepted_notes:
            result_ids = await self.invoke("addNotes", {"notes": accepted_notes})
            for card, result_id in zip(accepted_cards, result_ids, strict=False):
                if result_id is None:
                    skipped.append({"card_id": card.id, "reason": "Anki did not create this note."})
                else:
                    pushed.append({"card_id": card.id, "anki_note_id": result_id})
        sync_triggered = False
        if sync_after_push and pushed:
            await self.invoke("sync")
            sync_triggered = True
        if pushed:
            self.invalidate_library_cache()
        return AnkiPushResult(
            pushed=pushed,
            skipped=skipped,
            sync_triggered=sync_triggered,
            version=await self.detect_version(),
        )

    @staticmethod
    def _chunked(values: list[Any], size: int) -> Iterable[list[Any]]:
        for start in range(0, len(values), size):
            yield values[start : start + size]

    def _library_card_from_cards_info(self, info: dict[str, Any]) -> AnkiLibraryCard:
        fields = info.get("fields") or {}
        ordered_fields = sorted(
            (
                (int((field_payload or {}).get("order", index)), field_name, str((field_payload or {}).get("value", "")))
                for index, (field_name, field_payload) in enumerate(fields.items())
            ),
            key=lambda item: item[0],
        )
        values_by_name = {field_name: value for _, field_name, value in ordered_fields}
        model_name = str(info.get("modelName") or "")
        model_lower = model_name.casefold()
        if "cloze" in model_lower:
            card_type = "cloze"
            front = values_by_name.get("Text") or (ordered_fields[0][2] if ordered_fields else str(info.get("question") or ""))
            extra = values_by_name.get("Extra") or (ordered_fields[1][2] if len(ordered_fields) > 1 else "")
            back = str(info.get("answer") or extra)
        else:
            card_type = "basic"
            front = ordered_fields[0][2] if ordered_fields else str(info.get("question") or "")
            back = ordered_fields[1][2] if len(ordered_fields) > 1 else str(info.get("answer") or "")
            extra = ordered_fields[2][2] if len(ordered_fields) > 2 else ""
        return AnkiLibraryCard(
            id=f"anki:{info.get('cardId')}",
            note_id=str(info.get("note")) if info.get("note") is not None else None,
            model_name=model_name,
            deck_name=str(info.get("deckName") or "Default"),
            type=card_type,
            front=front,
            back=back,
            extra=extra,
        )

    async def fetch_all_cards_for_coverage(self, *, force_refresh: bool = False) -> list[AnkiLibraryCard]:
        self._sync_endpoint_state()
        now = time.monotonic()
        if not force_refresh and self._library_cache and now - self._library_cache[0] <= 45.0:
            return list(self._library_cache[1])

        last_error: Exception | None = None
        card_ids: list[Any] | None = None
        for query in ("", "*"):
            try:
                result = await self.invoke("findCards", {"query": query})
                card_ids = list(result or [])
                break
            except Exception as exc:  # pragma: no cover - depends on local AnkiConnect behavior
                last_error = exc
        if card_ids is None:
            raise AnkiConnectError(f"Could not fetch Anki cards for coverage: {last_error}")
        if not card_ids:
            self._library_cache = (now, [])
            return []

        library_cards: list[AnkiLibraryCard] = []
        for chunk in self._chunked(card_ids, 250):
            chunk_info = await self.invoke("cardsInfo", {"cards": chunk})
            for item in chunk_info or []:
                library_cards.append(self._library_card_from_cards_info(item))

        self._library_cache = (now, library_cards)
        return list(library_cards)
