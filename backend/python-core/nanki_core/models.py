from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .prompts import (
    DEFAULT_AUTO_FLASHCARD_SYSTEM_PROMPT,
    DEFAULT_CHAT_SYSTEM_PROMPT,
    DEFAULT_EXPLAIN_SYSTEM_PROMPT,
    DEFAULT_FLASHCARD_SYSTEM_PROMPT,
)


CardType = Literal["basic", "reverse", "cloze"]
SourceType = Literal["markdown", "text", "pdf", "pptx", "unknown"]
CoverageSource = Literal["editor", "preview", "source", "manual", "unknown"]
AppLanguage = Literal["en", "de"]
AIProvider = Literal["ollama_local", "ollama_cloud", "openrouter"]
AIRole = Literal["system", "user", "assistant"]


class AIPromptSettings(BaseModel):
    chat: str = DEFAULT_CHAT_SYSTEM_PROMPT
    explain: str = DEFAULT_EXPLAIN_SYSTEM_PROMPT
    flashcards: str = DEFAULT_FLASHCARD_SYSTEM_PROMPT
    auto_flashcards: str = DEFAULT_AUTO_FLASHCARD_SYSTEM_PROMPT


class AISettings(BaseModel):
    enabled: bool = False
    provider: AIProvider = "ollama_local"
    ollama_local_url: str = "http://127.0.0.1:11434"
    ollama_cloud_url: str = "https://ollama.com"
    openrouter_url: str = "https://openrouter.ai/api/v1"
    ollama_cloud_api_key: str = ""
    openrouter_api_key: str = ""
    default_model: str = ""
    chat_model: str = ""
    explain_model: str = ""
    flashcard_model: str = ""
    auto_flashcard_model: str = ""
    language: AppLanguage = "en"
    use_anki_coverage_context: bool = True
    chat_note_only: bool = False
    explain_note_only: bool = False
    auto_detect_ollama_models: bool = True
    prompts: AIPromptSettings = Field(default_factory=AIPromptSettings)


class APCGSettings(BaseModel):
    default_mode: str = "auto"
    include_anki_cards: bool = True
    auto_refresh: bool = False
    use_ai_coverage: bool = False  # Use AI for coverage analysis


class AppSettings(BaseModel):
    workspace_path: str
    anki_url: str = "http://127.0.0.1:8765"
    auto_sync: bool = False
    open_browser_on_launch: bool = True
    host: str = "127.0.0.1"
    port: int = 7788
    language: AppLanguage = "en"
    ai: AISettings = Field(default_factory=AISettings)
    apcg: APCGSettings = Field(default_factory=APCGSettings)


class NoteMetadata(BaseModel):
    id: str
    title: str
    tags: list[str] = Field(default_factory=list)
    pinned: bool = False
    created_at: str
    updated_at: str
    source_type: SourceType = "markdown"
    original_filename: str | None = None
    default_deck: str = "Default"
    folder_name: str = ""


class SourceItem(BaseModel):
    index: int
    label: str
    text: str


class SourceManifest(BaseModel):
    source_type: SourceType = "unknown"
    original_filename: str | None = None
    stored_filename: str | None = None
    items: list[SourceItem] = Field(default_factory=list)
    imported_at: str | None = None
    summary: str = ""


class CoverageAnchor(BaseModel):
    source: CoverageSource = "unknown"
    selected_text: str = ""
    prefix_text: str = ""
    suffix_text: str = ""
    raw_start: int | None = None
    raw_end: int | None = None
    note_start: int | None = None
    note_end: int | None = None
    source_item_index: int | None = None
    source_item_label: str = ""


class AppState(BaseModel):
    """App state for onboarding, update checks, etc."""

    has_seen_onboarding: bool = False
    last_update_check: str | None = None
    dismissed_version: str | None = None


class Card(BaseModel):
    id: str
    type: CardType = "basic"
    front: str = ""
    back: str = ""
    extra: str = ""
    tags: list[str] = Field(default_factory=list)
    deck_name: str = "Default"
    source_excerpt: str = ""
    source_locator: str = ""
    coverage_anchor: CoverageAnchor | None = None
    created_at: str
    updated_at: str
    last_pushed_at: str | None = None


class NoteDocument(BaseModel):
    meta: NoteMetadata
    content: str
    cards: list[Card] = Field(default_factory=list)
    source: SourceManifest | None = None


class NoteListItem(BaseModel):
    meta: NoteMetadata
    card_count: int = 0
    word_count: int = 0


class CreateNoteRequest(BaseModel):
    title: str = "Untitled note"
    tags: list[str] = Field(default_factory=list)
    content: str = ""
    default_deck: str = "Default"


class SaveNoteRequest(BaseModel):
    title: str
    tags: list[str] = Field(default_factory=list)
    pinned: bool = False
    content: str
    default_deck: str = "Default"


class SaveCardRequest(BaseModel):
    type: CardType = "basic"
    front: str = ""
    back: str = ""
    extra: str = ""
    tags: list[str] = Field(default_factory=list)
    deck_name: str = "Default"
    source_excerpt: str = ""
    source_locator: str = ""
    coverage_anchor: CoverageAnchor | None = None
    created_at: str | None = None


class RenderMarkdownRequest(BaseModel):
    markdown: str


class HtmlToMarkdownRequest(BaseModel):
    html: str


class WorkspaceUpdateRequest(BaseModel):
    workspace_path: str


class AnkiPushRequest(BaseModel):
    card_ids: list[str] | None = None
    deck_name: str | None = None
    sync_after_push: bool | None = None


class DuplicateNoteRequest(BaseModel):
    new_title: str | None = None


class ImportTextRequest(BaseModel):
    title: str = "Imported text"
    text: str
    tags: list[str] = Field(default_factory=list)
    source_type: SourceType = "text"
    default_deck: str = "Default"


class AIMessage(BaseModel):
    role: AIRole
    content: str


class AIChatRequest(BaseModel):
    note_id: str | None = None
    context_text: str = ""
    selected_text: str = ""
    question: str = ""
    messages: list[AIMessage] = Field(default_factory=list)
    model: str | None = None


class AIExplainRequest(BaseModel):
    note_id: str | None = None
    selected_text: str = ""
    question: str = ""
    model: str | None = None


class AIGenerateCardsRequest(BaseModel):
    note_id: str
    source_text: str = ""
    target_count: int | None = 8
    auto: bool = False
    model: str | None = None
    include_anki_coverage: bool | None = None


class AISuggestCardsForGapsRequest(BaseModel):
    note_id: str
    gap_excerpts: list[str]
    model: str | None = None


class AIGeneratedCard(BaseModel):
    type: CardType | Literal["cloze"] = "basic"
    front: str = ""
    back: str = ""
    extra: str = ""
    tags: list[str] = Field(default_factory=list)
    source_excerpt: str = ""


class AIModelInfo(BaseModel):
    id: str
    name: str
    provider: AIProvider
    context_length: int | None = None
    description: str = ""


class AITextResponse(BaseModel):
    provider: AIProvider
    model: str
    content: str


class AIGeneratedCardsResponse(BaseModel):
    provider: AIProvider
    model: str
    cards: list[AIGeneratedCard] = Field(default_factory=list)
    total_local_cards: int = 0
    total_anki_cards_scanned: int = 0
    relevant_anki_cards_shared: int = 0
    note_only: bool = True
