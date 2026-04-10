from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Iterable

import httpx

from .anki_connect import AnkiConnectClient, AnkiLibraryCard
from .config import SettingsManager
from .coverage import (
    COMMON_TERMS,
    best_excerpt_for_candidates,
    card_search_candidates,
    plain_card_text,
    unique_preserve_order,
)
from .models import (
    AIGeneratedCard,
    AIModelInfo,
    AIProvider,
    AISettings,
    AppSettings,
    Card,
    NoteDocument,
)
from .prompts import STRICT_TEXT_ONLY_APPENDIX

TOKEN_PATTERN = re.compile(r"\b[\w-]{3,}\b", re.UNICODE)
CODE_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)


class AIServiceError(RuntimeError):
    pass


class AIConfigurationError(AIServiceError):
    pass


@dataclass(slots=True)
class ProviderConfig:
    provider: AIProvider
    base_url: str
    headers: dict[str, str]


class AIService:
    def __init__(
        self, settings_manager: SettingsManager, anki_client: AnkiConnectClient
    ) -> None:
        self.settings_manager = settings_manager
        self.anki_client = anki_client

    def _normalize_base_url(self, url: str) -> str:
        return (url or "").strip().rstrip("/")

    def _provider_config(self, settings: AppSettings) -> ProviderConfig:
        ai = settings.ai
        if ai.provider == "ollama_local":
            base_url = (
                self._normalize_base_url(ai.ollama_local_url)
                or "http://127.0.0.1:11434"
            )
            return ProviderConfig(provider=ai.provider, base_url=base_url, headers={})
        if ai.provider == "ollama_cloud":
            base_url = (
                self._normalize_base_url(ai.ollama_cloud_url) or "https://ollama.com"
            )
            if not ai.ollama_cloud_api_key.strip():
                raise AIConfigurationError("Ollama Cloud API key is missing.")
            return ProviderConfig(
                provider=ai.provider,
                base_url=base_url,
                headers={"Authorization": f"Bearer {ai.ollama_cloud_api_key.strip()}"},
            )
        if ai.provider == "openrouter":
            base_url = (
                self._normalize_base_url(ai.openrouter_url)
                or "https://openrouter.ai/api/v1"
            )
            if not ai.openrouter_api_key.strip():
                raise AIConfigurationError("OpenRouter API key is missing.")
            return ProviderConfig(
                provider=ai.provider,
                base_url=base_url,
                headers={
                    "Authorization": f"Bearer {ai.openrouter_api_key.strip()}",
                    "HTTP-Referer": "http://127.0.0.1",
                    "X-OpenRouter-Title": "Nanki",
                },
            )
        raise AIConfigurationError(f"Unsupported AI provider: {ai.provider}")

    async def _request_json(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        json_body: dict[str, Any] | None = None,
        timeout: float = 240.0,
    ) -> Any:
        timeout_config = httpx.Timeout(
            timeout,
            connect=min(timeout, 15.0),
            write=min(timeout, 60.0),
            pool=min(timeout, 60.0),
        )
        try:
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                response = await client.request(
                    method, url, headers=headers, json=json_body
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip()
            raise AIServiceError(
                f"AI request failed with HTTP {exc.response.status_code}: {detail}"
            ) from exc
        except httpx.HTTPError as exc:
            raise AIServiceError(f"AI request failed: {exc}") from exc
        try:
            return response.json()
        except ValueError as exc:
            raise AIServiceError("AI provider returned invalid JSON.") from exc

    def resolve_model(
        self,
        settings: AppSettings,
        task: str,
        available_models: Iterable[AIModelInfo] | None = None,
    ) -> str:
        """Resolve the model to use for a given task."""
        ai = settings.ai
        task_lookup = {
            "chat": ai.chat_model,
            "explain": ai.explain_model,
            "flashcards": ai.flashcard_model,
            "auto_flashcards": ai.auto_flashcard_model,
        }
        for candidate in (task_lookup.get(task, ""), ai.default_model):
            if candidate and candidate.strip():
                return candidate.strip()
        if available_models:
            first = next(iter(available_models), None)
            if first is not None:
                return first.id
        raise AIConfigurationError("No AI model is configured.")

    def _completion_timeout(self, task: str) -> float:
        if task in {"flashcards", "auto_flashcards"}:
            return 420.0
        if task == "explain":
            return 300.0
        return 240.0

    async def list_models(self, settings: AppSettings | None = None) -> dict[str, Any]:
        settings = settings or self.settings_manager.load()
        config = self._provider_config(settings)
        if config.provider in {"ollama_local", "ollama_cloud"}:
            raw = await self._request_json(
                "GET",
                f"{config.base_url}/api/tags",
                headers=config.headers,
                timeout=30.0,
            )
            models = [
                AIModelInfo(
                    id=str(item.get("model") or item.get("name") or "").strip(),
                    name=str(item.get("name") or item.get("model") or "").strip(),
                    provider=config.provider,
                    description=str(
                        ((item.get("details") or {}).get("family") or "")
                    ).strip(),
                )
                for item in raw.get("models", [])
                if str(item.get("model") or item.get("name") or "").strip()
            ]
        else:
            raw = await self._request_json(
                "GET", f"{config.base_url}/models", headers=config.headers, timeout=45.0
            )
            models = [
                AIModelInfo(
                    id=str(item.get("id") or "").strip(),
                    name=str(item.get("name") or item.get("id") or "").strip(),
                    provider=config.provider,
                    context_length=(
                        item.get("context_length")
                        if isinstance(item.get("context_length"), int)
                        else None
                    ),
                    description=str(item.get("description") or "").strip(),
                )
                for item in raw.get("data", [])
                if str(item.get("id") or "").strip()
            ]
        models.sort(key=lambda item: item.name.casefold())
        return {
            "provider": config.provider,
            "base_url": config.base_url,
            "models": [item.model_dump() for item in models],
            "count": len(models),
        }

    async def test_connection(
        self, settings: AppSettings | None = None
    ) -> dict[str, Any]:
        settings = settings or self.settings_manager.load()
        listed = await self.list_models(settings)
        models = [AIModelInfo.model_validate(item) for item in listed["models"]]
        return {
            **listed,
            "default_model": self.resolve_model(settings, "chat", models)
            if models or settings.ai.default_model
            else "",
            "ok": True,
        }

    async def _chat_completion(
        self,
        settings: AppSettings,
        *,
        task: str,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.2,
    ) -> tuple[str, str, AIProvider]:
        config = self._provider_config(settings)
        available = None
        if not model:
            try:
                available_models = await self.list_models(settings)
                available = [
                    AIModelInfo.model_validate(item)
                    for item in available_models["models"]
                ]
            except Exception:
                available = None
        selected_model = (
            model or self.resolve_model(settings, task, available)
        ).strip()
        if config.provider in {"ollama_local", "ollama_cloud"}:
            payload = {
                "model": selected_model,
                "messages": messages,
                "stream": False,
                "options": {"temperature": temperature},
            }
            raw = await self._request_json(
                "POST",
                f"{config.base_url}/api/chat",
                headers=config.headers,
                json_body=payload,
                timeout=self._completion_timeout(task),
            )
            content = str(((raw.get("message") or {}).get("content") or "")).strip()
        else:
            payload = {
                "model": selected_model,
                "messages": messages,
                "temperature": temperature,
            }
            raw = await self._request_json(
                "POST",
                f"{config.base_url}/chat/completions",
                headers=config.headers,
                json_body=payload,
                timeout=self._completion_timeout(task),
            )
            choices = raw.get("choices") or []
            content = str(
                (
                    ((choices[0] if choices else {}).get("message") or {}).get(
                        "content"
                    )
                    or ""
                )
            ).strip()
        if not content:
            raise AIServiceError("AI provider returned an empty response.")
        return content, selected_model, config.provider

    def _strict_prompt(self, base_prompt: str, *, strict: bool) -> str:
        if not strict:
            return base_prompt
        return f"{base_prompt}\n\n{STRICT_TEXT_ONLY_APPENDIX}"

    def _build_text_context(
        self,
        *,
        note: NoteDocument | None,
        context_text: str = "",
        selected_text: str = "",
        question: str = "",
        include_full_note: bool = True,
    ) -> str:
        parts = []
        if note is not None:
            parts.append(f"NOTE TITLE:\n{note.meta.title}")
            if include_full_note and note.content.strip():
                parts.append(f"FULL NOTE TEXT:\n{note.content.strip()}")
        if context_text.strip():
            parts.append(f"FOCUS TEXT:\n{context_text.strip()}")
        if selected_text.strip():
            parts.append(f"SELECTED TEXT:\n{selected_text.strip()}")
        if question.strip():
            parts.append(f"USER TASK / QUESTION:\n{question.strip()}")
        return "\n\n".join(parts).strip()

    async def chat(
        self,
        settings: AppSettings,
        *,
        note: NoteDocument | None,
        messages: list[dict[str, str]],
        context_text: str = "",
        selected_text: str = "",
        question: str = "",
        model: str | None = None,
    ) -> dict[str, Any]:
        strict = bool(settings.ai.chat_note_only)
        system_prompt = self._strict_prompt(settings.ai.prompts.chat, strict=strict)
        context_message = self._build_text_context(
            note=note,
            context_text=context_text,
            selected_text=selected_text,
            question=question,
        )
        assembled = [{"role": "system", "content": system_prompt}]
        if context_message:
            assembled.append(
                {
                    "role": "user",
                    "content": f"Use the following context for the conversation:\n\n{context_message}",
                }
            )
        assembled.extend(messages)
        content, selected_model, provider = await self._chat_completion(
            settings,
            task="chat",
            messages=assembled,
            model=model,
            temperature=0.2 if not strict else 0.0,
        )
        return {"provider": provider, "model": selected_model, "content": content}

    async def explain(
        self,
        settings: AppSettings,
        *,
        note: NoteDocument | None,
        selected_text: str,
        question: str = "",
        model: str | None = None,
    ) -> dict[str, Any]:
        strict = bool(settings.ai.explain_note_only)
        system_prompt = self._strict_prompt(settings.ai.prompts.explain, strict=strict)
        user_prompt = self._build_text_context(
            note=note,
            selected_text=selected_text,
            question=question or "Explain the selected text clearly and faithfully.",
            include_full_note=not bool(selected_text.strip()),
        )
        content, selected_model, provider = await self._chat_completion(
            settings,
            task="explain",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=model,
            temperature=0.1 if not strict else 0.0,
        )
        return {"provider": provider, "model": selected_model, "content": content}

    def _tokenize_keywords(self, text: str) -> list[str]:
        tokens: list[str] = []
        seen: set[str] = set()
        for match in TOKEN_PATTERN.finditer(plain_card_text(text).casefold()):
            token = match.group(0)
            if token in COMMON_TERMS or token in seen:
                continue
            if token.isdigit():
                continue
            seen.add(token)
            tokens.append(token)
        return tokens

    def _card_signature(self, card: Card | AnkiLibraryCard) -> dict[str, Any]:
        candidates = card_search_candidates(card)
        merged = " ".join(candidates)
        keywords = self._tokenize_keywords(merged)[:12]
        deck_name = str(getattr(card, "deck_name", "") or "")
        origin = str(getattr(card, "origin", "local") or "local")
        card_type = str(getattr(card, "type", "basic") or "basic")
        return {
            "origin": origin,
            "deck": deck_name,
            "type": card_type,
            "keywords": keywords,
        }

    def _semantic_overlap_score(
        self, source_keywords: set[str], signature: dict[str, Any]
    ) -> float:
        keywords = set(signature.get("keywords") or [])
        if not source_keywords or not keywords:
            return 0.0
        overlap = source_keywords & keywords
        if not overlap:
            return 0.0
        return (len(overlap) / max(1, len(keywords))) + (
            len(overlap) / max(1, len(source_keywords))
        )

    async def _build_semantic_coverage_context(
        self,
        settings: AppSettings,
        *,
        note: NoteDocument,
        source_text: str,
        include_anki_coverage: bool,
    ) -> dict[str, Any]:
        source_keywords = set(self._tokenize_keywords(source_text or note.content))
        local_signatures = [self._card_signature(card) for card in note.cards]

        anki_cards: list[AnkiLibraryCard] = []
        if include_anki_coverage:
            try:
                anki_cards = await self.anki_client.fetch_all_cards_for_coverage()
            except Exception:
                anki_cards = []
        ranked: list[tuple[float, dict[str, Any]]] = []
        for card in anki_cards:
            signature = self._card_signature(card)
            ranked.append(
                (self._semantic_overlap_score(source_keywords, signature), signature)
            )
        ranked.sort(key=lambda item: item[0], reverse=True)
        relevant = [signature for score, signature in ranked if score > 0][:80]
        if not relevant:
            relevant = [
                signature for _, signature in ranked[:40] if signature.get("keywords")
            ]

        covered_keywords: list[str] = []
        seen: set[str] = set()
        for signature in [*local_signatures, *relevant]:
            for keyword in signature.get("keywords") or []:
                if keyword not in seen:
                    seen.add(keyword)
                    covered_keywords.append(keyword)
                if len(covered_keywords) >= 96:
                    break
            if len(covered_keywords) >= 96:
                break

        compact_signatures = []
        for signature in [*local_signatures[:16], *relevant[:24]]:
            keywords = list(signature.get("keywords") or [])[:8]
            if not keywords:
                continue
            compact_signatures.append(
                {
                    "origin": signature.get("origin"),
                    "deck": signature.get("deck"),
                    "type": signature.get("type"),
                    "keywords": keywords,
                }
            )

        return {
            "total_local_cards": len(local_signatures),
            "total_anki_cards_scanned": len(anki_cards),
            "relevant_anki_cards_shared": len(relevant),
            "covered_keywords": covered_keywords,
            "shared_card_topics": compact_signatures,
            "provider": settings.ai.provider,
        }

    def _extract_json_payload(self, text: str) -> Any:
        cleaned = (text or "").strip()
        if not cleaned:
            raise AIServiceError("AI returned no JSON content.")
        fence_match = CODE_FENCE_PATTERN.search(cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        for candidate in (
            cleaned,
            self._slice_brackets(cleaned, "{", "}"),
            self._slice_brackets(cleaned, "[", "]"),
        ):
            if not candidate:
                continue
            repaired_candidates = [candidate]
            repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)
            if repaired != candidate:
                repaired_candidates.append(repaired)
            for repaired_candidate in repaired_candidates:
                try:
                    return json.loads(repaired_candidate)
                except json.JSONDecodeError:
                    continue
        raise AIServiceError("AI returned invalid JSON for flashcards.")

    @staticmethod
    def _slice_brackets(text: str, left: str, right: str) -> str:
        start = text.find(left)
        end = text.rfind(right)
        if start == -1 or end == -1 or start >= end:
            return ""
        return text[start : end + 1]

    def _normalize_generated_cards(
        self, raw: Any, *, source_text: str = ""
    ) -> list[AIGeneratedCard]:
        if isinstance(raw, dict):
            candidate_items = raw.get("cards", [])
        else:
            candidate_items = raw
        cards: list[AIGeneratedCard] = []
        fallback_excerpt = (
            best_excerpt_for_candidates(source_text, [source_text[:220]])
            if source_text.strip()
            else ""
        )
        for item in candidate_items or []:
            if not isinstance(item, dict):
                continue
            card_type = str(item.get("type") or "basic").strip().lower()
            if card_type not in {"basic", "cloze"}:
                card_type = "basic"
            front = str(item.get("front") or item.get("question") or "").strip()
            back = str(item.get("back") or item.get("answer") or "").strip()
            extra = str(item.get("extra") or item.get("context") or "").strip()
            source_excerpt = str(
                item.get("source_excerpt") or item.get("excerpt") or ""
            ).strip()
            raw_tags = item.get("tags") or []
            tags = (
                [str(tag).strip() for tag in raw_tags if str(tag).strip()]
                if isinstance(raw_tags, list)
                else []
            )
            if not front:
                continue
            if card_type != "cloze" and not back:
                continue
            if not source_excerpt:
                source_excerpt = (
                    best_excerpt_for_candidates(source_text, [front, back, extra])
                    if source_text.strip()
                    else ""
                )
            cards.append(
                AIGeneratedCard(
                    type=card_type,
                    front=front,
                    back=back,
                    extra=extra,
                    tags=unique_preserve_order(tags),
                    source_excerpt=source_excerpt or fallback_excerpt,
                )
            )
        return cards

    async def generate_cards(
        self,
        settings: AppSettings,
        *,
        note: NoteDocument,
        source_text: str,
        target_count: int | None,
        auto: bool = False,
        model: str | None = None,
        include_anki_coverage: bool = True,
    ) -> dict[str, Any]:
        source_text = (source_text or note.content).strip()
        if not source_text:
            raise AIServiceError("No source text was provided for card generation.")
        auto_count = target_count is None
        if not auto_count:
            target_count = max(1, min(48, int(target_count or 8)))
        coverage_context = await self._build_semantic_coverage_context(
            settings,
            note=note,
            source_text=source_text,
            include_anki_coverage=include_anki_coverage,
        )
        prompt = (
            settings.ai.prompts.auto_flashcards
            if auto
            else settings.ai.prompts.flashcards
        )
        prompt = (
            f"{prompt}\n\n"
            "Mandatory output rules for this request:\n"
            "- Output one JSON object only. No commentary, no chain-of-thought, no markdown fences.\n"
            "- Every returned card must contain source_excerpt copied verbatim from the provided source text.\n"
            "- If a card cannot be grounded in the source text, do not return it."
        )
        count_instruction = (
            "Decide the optimal number of cards yourself based on the complexity and density of the source text."
            if auto_count
            else f"Generate approximately {target_count} cards."
        )
        user_payload: dict[str, Any] = {
            "task": "auto_flashcards" if auto else "flashcards",
            "count_instruction": count_instruction,
            "note_title": note.meta.title,
            "source_text": source_text,
            "semantic_existing_card_context": coverage_context,
        }
        if not auto_count:
            user_payload["target_count"] = target_count
        content, selected_model, provider = await self._chat_completion(
            settings,
            task="auto_flashcards" if auto else "flashcards",
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False, indent=2),
                },
            ],
            model=model,
            temperature=0.0,
        )
        parsed = self._extract_json_payload(content)
        cards = self._normalize_generated_cards(parsed, source_text=source_text)
        if not cards:
            raise AIServiceError("AI did not return any usable flashcards.")
        return {
            "provider": provider,
            "model": selected_model,
            "cards": [card.model_dump() for card in cards],
            "total_local_cards": coverage_context["total_local_cards"],
            "total_anki_cards_scanned": coverage_context["total_anki_cards_scanned"],
            "relevant_anki_cards_shared": coverage_context[
                "relevant_anki_cards_shared"
            ],
            "note_only": True,
        }

    async def suggest_cards_for_gaps(
        self,
        settings: AppSettings,
        *,
        note: NoteDocument,
        gap_excerpts: list[str],
        model: str | None = None,
    ) -> dict[str, Any]:
        if not gap_excerpts:
            raise AIServiceError("No gap excerpts provided for card suggestions.")
        combined_gaps = "\n\n---\n\n".join(gap_excerpts)
        coverage_context = await self._build_semantic_coverage_context(
            settings,
            note=note,
            source_text=combined_gaps,
            include_anki_coverage=True,
        )
        prompt = settings.ai.prompts.flashcards
        prompt = (
            f"{prompt}\n\n"
            "Your task: Generate flashcards that cover the uncovered gaps in the note.\n"
            "Focus on creating cards for the gap excerpts provided below.\n"
            "Mandatory output rules for this request:\n"
            "- Output one JSON object only. No commentary, no chain-of-thought, no markdown fences.\n"
            "- Every returned card must contain source_excerpt copied verbatim from the provided gap excerpts.\n"
            "- If a card cannot be grounded in the gap excerpts, do not return it."
        )
        user_payload: dict[str, Any] = {
            "task": "gap_coverage_cards",
            "note_title": note.meta.title,
            "gap_excerpts": gap_excerpts,
            "semantic_existing_card_context": coverage_context,
        }
        content, selected_model, provider = await self._chat_completion(
            settings,
            task="flashcards",
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False, indent=2),
                },
            ],
            model=model,
            temperature=0.0,
        )
        parsed = self._extract_json_payload(content)
        cards = self._normalize_generated_cards(parsed, source_text=combined_gaps)
        if not cards:
            raise AIServiceError(
                "AI did not return any usable flashcards for the gaps."
            )
        return {
            "provider": provider,
            "model": selected_model,
            "cards": [card.model_dump() for card in cards],
            "total_local_cards": coverage_context["total_local_cards"],
            "total_anki_cards_scanned": coverage_context["total_anki_cards_scanned"],
            "relevant_anki_cards_shared": coverage_context[
                "relevant_anki_cards_shared"
            ],
            "note_only": True,
        }
