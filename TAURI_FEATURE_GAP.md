# Nanki Tauri Feature Gap Analysis

**Branch Comparison:** `main` (Python/FastAPI) vs `feature/tauri-desktop-rebuild` (Tauri/Rust + React)

**Generated:** 2025-04-16

---

## Executive Summary

| Category | Main Branch | Tauri Branch | Gap Status |
|----------|-------------|--------------|------------|
| Core Features | 15 modules | 1 minimal module | **95% missing** |
| API Endpoints | 50+ endpoints | 1 endpoint (/health) | **98% missing** |
| Frontend Views | Full web UI | 6 placeholder views | **90% missing** |
| Backend Logic | Complete | Stub only | **100% missing** |

---

## 1. Core Backend Modules

### 1.1 Python Backend (main branch)

| File | Lines | Purpose | Tauri Status |
|------|-------|---------|--------------|
| `app.py` | ~900 | FastAPI application with 50+ endpoints | **missing** |
| `storage.py` | ~300 | Workspace/note persistence (markdown + JSON) | **missing** |
| `anki_connect.py` | ~400 | Anki integration via AnkiConnect API | **missing** |
| `ai.py` | ~750 | AI card generation (Ollama/OpenRouter) | **missing** |
| `exporters.py` | ~500 | Export to CSV, Anki TXT, APKG | **missing** |
| `importers.py` | ~200 | Import from MD/TXT/PDF/PPTX | **missing** |
| `config.py` | ~100 | Settings management | **missing** |
| `models.py` | ~200 | Pydantic data models | **missing** |
| `prompts.py` | ~170 | AI system prompts | **missing** |
| `updater.py` | ~250 | Auto-updater logic | **missing** |
| `coverage_apcg.py` | ~1800 | APCG coverage algorithm | **missing** |
| `coverage_utils.py` | ~100 | Coverage utility functions | **missing** |

### 1.2 Tauri Backend (feature/tauri-desktop-rebuild)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `lib.rs` | ~100 | Tauri app setup + backend spawn | **present** |
| `main.rs` | minimal | Entry point | **present** |
| `nanki_core/app.py` | ~20 | Minimal FastAPI (health only) | **stub** |
| `nanki_core/routes/health.py` | ~10 | Health endpoint | **present** |

**Critical Gap:** The Tauri backend has only a `/health` endpoint. All 50+ API endpoints from main are missing.

---

## 2. API Endpoints Comparison

### 2.1 Endpoints in main (50+)

#### Settings & State
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/settings` | GET | Get app settings | ❌ missing |
| `/api/settings` | PUT | Update settings | ❌ missing |
| `/api/state` | GET | Get app state | ❌ missing |
| `/api/state` | PUT | Update state | ❌ missing |
| `/api/updates/check` | GET | Check for updates | ❌ missing |
| `/api/settings/workspace` | POST | Update workspace path | ❌ missing |
| `/api/settings/prompts/reset` | POST | Reset AI prompts | ❌ missing |
| `/api/settings/apcg/reset` | POST | Reset APCG settings | ❌ missing |

#### Notes Management
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/notes` | GET | List all notes | ❌ missing |
| `/api/notes` | POST | Create note | ❌ missing |
| `/api/notes/{id}` | GET | Get note by ID | ❌ missing |
| `/api/notes/{id}` | PUT | Update note | ❌ missing |
| `/api/notes/{id}` | DELETE | Delete note | ❌ missing |
| `/api/notes/{id}/duplicate` | POST | Duplicate note | ❌ missing |

#### Cards Management
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/notes/{id}/cards` | POST | Create card | ❌ missing |
| `/api/notes/{id}/cards/{cid}` | PUT | Update card | ❌ missing |
| `/api/notes/{id}/cards/{cid}` | DELETE | Delete card | ❌ missing |
| `/api/notes/{id}/cards/export/csv` | POST | Export to CSV | ❌ missing |
| `/api/notes/{id}/cards/export/anki-txt` | POST | Export Anki TXT | ❌ missing |
| `/api/notes/{id}/cards/export/apkg` | POST | Export APKG | ❌ missing |
| `/api/notes/{id}/cards/push` | POST | Push cards to Anki | ❌ missing |

#### Import
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/import/file` | POST | Import file upload | ❌ missing |
| `/api/import/text` | POST | Import text | ❌ missing |
| `/api/notes/{id}/source` | GET | Get note source | ❌ missing |
| `/api/notes/{id}/source/file/{name}` | GET | Get source file | ❌ missing |

#### Coverage Analysis
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/notes/{id}/coverage` | GET | APCG coverage | ❌ missing |
| `/api/notes/{id}/coverage/apcg` | POST | APCG analysis | ❌ missing |
| `/api/notes/{id}/coverage/ai` | GET | AI coverage | ❌ missing |
| `/api/notes/{id}/coverage/summary` | GET | Coverage summary | ❌ missing |

#### AI Integration
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/ai/test` | POST | Test AI connection | ❌ missing |
| `/api/ai/models` | GET | List AI models | ❌ missing |
| `/api/ai/chat` | POST | AI chat | ❌ missing |
| `/api/ai/explain` | POST | AI explain text | ❌ missing |
| `/api/ai/generate-cards` | POST | Generate flashcards | ❌ missing |
| `/api/ai/suggest-cards-for-gaps` | POST | Suggest cards for gaps | ❌ missing |

#### Anki Integration
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/api/anki/test` | POST | Test Anki connection | ❌ missing |
| `/api/anki/decks` | GET | List Anki decks | ❌ missing |

#### Utility
| Endpoint | Method | Purpose | Tauri |
|----------|--------|---------|-------|
| `/` | GET | Serve index.html | ❌ missing |
| `/api/render-markdown` | POST | Render markdown | ❌ missing |
| `/api/convert-html` | POST | HTML to markdown | ❌ missing |
| `/api/download` | GET | Download exports | ❌ missing |

### 2.2 Endpoints in Tauri (1)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/health` | GET | Health check | ✅ present |

---

## 3. Frontend Components Comparison

### 3.1 Main Branch (Full Web UI)

The main branch has a complete web interface with:
- Note editor with markdown support
- Card editor (create/edit/delete cards)
- Coverage analysis visualization
- AI chat interface
- Settings panel
- Import wizards
- Anki sync controls
- Real-time updates

### 3.2 Tauri Branch (Placeholder Views)

| View | Lines | Features | Status |
|------|-------|----------|--------|
| `workspace-view.jsx` | ~40 | Placeholder welcome | **stub** |
| `import-view.jsx` | ~80 | File dropzone (no backend) | **stub** |
| `library-view.jsx` | ~55 | Empty list (no data) | **stub** |
| `analysis-view.jsx` | ~40 | Placeholder text | **stub** |
| `review-view.jsx` | ~45 | Placeholder buttons | **stub** |
| `settings-view.jsx` | ~75 | Static form (no save) | **stub** |

**Missing Frontend Features:**
- ❌ Note creation/editing
- ❌ Card creation/editing
- ❌ Coverage visualization
- ❌ AI chat interface
- ❌ Settings persistence
- ❌ Anki deck selection
- ❌ Model selection for AI
- ❌ Real markdown editor
- ❌ Card preview
- ❌ Import progress
- ❌ Export options

---

## 4. Feature Categories - Detailed Gap Analysis

### 4.1 Note Management - Priority: CRITICAL

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Create note | ✅ | ❌ | Add POST `/api/notes` endpoint, wire to frontend |
| List notes | ✅ | ❌ | Add GET `/api/notes`, implement library view |
| Get note | ✅ | ❌ | Add GET `/api/notes/{id}`, add editor component |
| Update note | ✅ | ❌ | Add PUT endpoint, wire to editor |
| Delete note | ✅ | ❌ | Add DELETE endpoint, add confirmation UI |
| Duplicate note | ✅ | ❌ | Add POST `/api/notes/{id}/duplicate` |
| Markdown content | ✅ | ❌ | Copy storage.py logic, add markdown rendering |
| Tags | ✅ | ❌ | Add tags field to models, update UI |
| Pin notes | ✅ | ❌ | Add pinned field, update list sorting |
| Default deck | ✅ | ❌ | Add default_deck to note model |

### 4.2 Card Management - Priority: CRITICAL

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Create card | ✅ | ❌ | Add POST `/api/notes/{id}/cards` |
| Update card | ✅ | ❌ | Add PUT `/api/notes/{id}/cards/{cid}` |
| Delete card | ✅ | ❌ | Add DELETE `/api/notes/{id}/cards/{cid}` |
| Card types (basic/reverse/cloze) | ✅ | ❌ | Copy CardType enum, add UI toggle |
| Source excerpt | ✅ | ❌ | Add source_excerpt field |
| Coverage anchor | ✅ | ❌ | Add coverage_anchor field |
| Tags on cards | ✅ | ❌ | Add tags array to card model |
| Deck assignment | ✅ | ❌ | Add deck_name field |

### 4.3 Storage System - Priority: CRITICAL

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Workspace path | ✅ | ❌ | Copy SettingsManager logic |
| Note persistence (markdown) | ✅ | ❌ | Copy storage.py parse/save logic |
| Card persistence (JSON) | ✅ | ❌ | Copy cards.json logic |
| Source files | ✅ | ❌ | Add source manifest support |
| Exports directory | ✅ | ❌ | Add export path handling |

### 4.4 Import System - Priority: HIGH

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Markdown import | ✅ | ❌ | Copy importers.py MD logic |
| Text import | ✅ | ❌ | Copy text parsing |
| PDF import | ✅ | ❌ | Add PyMuPDF dependency |
| PPTX import | ✅ | ❌ | Add pptx parsing |
| Source manifest | ✅ | ❌ | Add SourceManifest model |
| Drag & drop UI | partial | partial | Wire dropzone to backend |

### 4.5 Export System - Priority: HIGH

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| CSV export | ✅ | ❌ | Copy exporters.py CSV logic |
| Anki TXT export | ✅ | ❌ | Copy TXT format logic |
| APKG export | ✅ | ❌ | Copy SQLite/ZIP generation |
| Download endpoint | ✅ | ❌ | Add file download handler |

### 4.6 Anki Integration - Priority: HIGH

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Test connection | ✅ | ❌ | Copy anki_connect.py test logic |
| List decks | ✅ | ❌ | Add deck_names() call |
| Push cards | ✅ | ❌ | Copy push_cards() logic |
| Anki library cache | ✅ | ❌ | Add library caching |
| Card models (Basic/Reverse/Cloze) | ✅ | ❌ | Add model selection UI |
| Sync after push | ✅ | ❌ | Add sync trigger option |

### 4.7 AI Integration - Priority: MEDIUM

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Ollama Local | ✅ | ❌ | Copy ai.py Ollama handler |
| Ollama Cloud | ✅ | ❌ | Add API key handling |
| OpenRouter | ✅ | ❌ | Add OpenRouter integration |
| Chat | ✅ | ❌ | Add chat endpoint + UI |
| Explain | ✅ | ❌ | Add explain endpoint |
| Generate cards | ✅ | ❌ | Add generation endpoint |
| Auto flashcards | ✅ | ❌ | Add auto-generation |
| Suggest for gaps | ✅ | ❌ | Add gap suggestion |
| Model selection | ✅ | ❌ | Add model picker UI |
| Custom prompts | ✅ | ❌ | Add prompt editor |
| Anki coverage context | ✅ | ❌ | Add context building |

### 4.8 Coverage Analysis - Priority: MEDIUM

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| APCG algorithm | ✅ | ❌ | Copy coverage_apcg.py (~1800 lines) |
| Coverage modes | ✅ | ❌ | Copy CoverageMode enum |
| Proposition extraction | ✅ | ❌ | Copy extraction logic |
| Evidence matching | ✅ | ❌ | Copy matching logic |
| Score calculation | ✅ | ❌ | Copy scoring logic |
| HTML visualization | ✅ | ❌ | Copy generate_coverage_html |
| AI coverage | ✅ | ❌ | Add AI analysis endpoint |
| Summary view | ✅ | ❌ | Add summary endpoint |

### 4.9 Settings - Priority: HIGH

| Feature | Main | Tauri | Implementation Steps |
|---------|------|-------|---------------------|
| Workspace path | ✅ | ❌ | Add workspace setting |
| Anki URL | ✅ | ❌ | Add AnkiConnect URL |
| Auto sync | ✅ | ❌ | Add sync toggle |
| Language | ✅ | ❌ | Add language selector |
| AI provider | ✅ | ❌ | Add provider dropdown |
| AI model selection | ✅ | ❌ | Add model dropdown |
| Custom prompts | ✅ | ❌ | Add prompt editor |
| APCG settings | ✅ | ❌ | Add APCG config |

---

## 5. Implementation Priority Matrix

### CRITICAL (Must have for MVP)

1. **Storage System** - Backend persistence is foundational
   - Copy `storage.py` to `nanki_core/storage.py`
   - Copy `config.py` for settings
   - Copy `models.py` for data structures

2. **Note CRUD** - Core functionality
   - Add note endpoints to FastAPI
   - Implement library view with real data

3. **Card CRUD** - Essential for flashcard creation
   - Add card endpoints
   - Create card editor component

4. **Markdown Editor** - Content editing
   - Add markdown rendering
   - Wire to note content

### HIGH (Important for usable app)

5. **Anki Integration** - Push cards to Anki
   - Copy `anki_connect.py`
   - Add Anki settings UI

6. **Import System** - Get content into app
   - Copy `importers.py`
   - Wire import view to backend

7. **Export System** - Get cards out
   - Copy `exporters.py`
   - Add export buttons

### MEDIUM (Enhances functionality)

8. **AI Integration** - Smart card generation
   - Copy `ai.py`
   - Add AI settings UI

9. **Coverage Analysis** - Learning optimization
   - Copy `coverage_apcg.py`
   - Add analysis visualization

### LOW (Polish)

10. **Auto-updater** - Keep app current
    - Copy `updater.py` logic
    - Add update check UI

---

## 6. Recommended Implementation Order

### Phase 1: Core Foundation (Est. 2-3 days)
1. Copy `models.py` to `nanki_core/models.py`
2. Copy `config.py` to `nanki_core/config.py`
3. Copy `storage.py` to `nanki_core/storage.py`
4. Add note CRUD endpoints to FastAPI
5. Wire frontend library view to real endpoints
6. Add note creation/deletion

### Phase 2: Cards (Est. 2-3 days)
1. Add card CRUD endpoints
2. Create card editor component
3. Add card list to note view
4. Implement card types (basic/reverse/cloze)

### Phase 3: Import (Est. 1-2 days)
1. Copy `importers.py`
2. Add file upload endpoint
3. Wire dropzone to backend
4. Add source manifest support

### Phase 4: Anki (Est. 2 days)
1. Copy `anki_connect.py`
2. Add Anki test/deck endpoints
3. Add push cards endpoint
4. Create Anki settings UI

### Phase 5: Export (Est. 1 day)
1. Copy `exporters.py`
2. Add export endpoints
3. Add download buttons to UI

### Phase 6: AI (Est. 2-3 days)
1. Copy `ai.py` and `prompts.py`
2. Add AI endpoints
3. Create AI settings UI
4. Add card generation flow

### Phase 7: Coverage (Est. 2 days)
1. Copy `coverage_apcg.py` and `coverage_utils.py`
2. Add coverage endpoints
3. Create coverage visualization

---

## 7. Code Migration Checklist

### Files to Copy (with modifications)

- [ ] `models.py` → `nanki_core/models.py`
- [ ] `config.py` → `nanki_core/config.py`
- [ ] `storage.py` → `nanki_core/storage.py`
- [ ] `anki_connect.py` → `nanki_core/anki_connect.py`
- [ ] `importers.py` → `nanki_core/importers.py`
- [ ] `exporters.py` → `nanki_core/exporters.py`
- [ ] `ai.py` → `nanki_core/ai.py`
- [ ] `prompts.py` → `nanki_core/prompts.py`
- [ ] `coverage_apcg.py` → `nanki_core/coverage_apcg.py`
- [ ] `coverage_utils.py` → `nanki_core/coverage_utils.py`

### Files to Keep (Tauri-specific)

- [x] `lib.rs` - Tauri setup (already present)
- [x] `main.rs` - Entry point (already present)
- [x] `nanki_core/app.py` - FastAPI app (extend with endpoints)
- [x] `nanki_core/routes/health.py` - Keep as health check

### Frontend Components to Build

- [ ] Note editor (markdown + preview)
- [ ] Card editor (front/back/extra fields)
- [ ] Card list view
- [ ] Anki settings panel
- [ ] AI settings panel
- [ ] Coverage visualization
- [ ] Import progress indicator
- [ ] Export buttons

---

## 8. Key Architectural Decisions

### Backend Architecture
- **Decision:** Keep Python FastAPI backend, spawned by Tauri
- **Rationale:** Complex AI and coverage logic is Python-native
- **Port:** Changed from 7788 to 8642 in Tauri branch

### Data Storage
- **Decision:** Keep markdown + JSON file storage
- **Rationale:** Human-readable, version-control-friendly
- **Location:** Workspace path in user home directory

### Anki Integration
- **Decision:** Use AnkiConnect HTTP API
- **Port:** 8765 (configurable)
- **Required:** Anki must be running with AnkiConnect addon

### AI Integration
- **Providers:** Ollama Local, Ollama Cloud, OpenRouter
- **Models:** User-configurable per task (chat/explain/flashcards)
- **Prompts:** Customizable in settings

---

## 9. Testing Priorities

1. **Storage tests** - Note creation, card CRUD, file persistence
2. **Anki tests** - Connection, deck listing, card push
3. **AI tests** - Connection, model listing, card generation
4. **Import tests** - MD/TXT/PDF/PPTX parsing
5. **Export tests** - CSV/TXT/APKG generation
6. **Coverage tests** - APCG algorithm correctness

---

## 10. Summary

The `feature/tauri-desktop-rebuild` branch contains a **skeleton application** with:
- ✅ Tauri desktop wrapper
- ✅ Python backend spawn mechanism
- ✅ Basic health endpoint
- ✅ UI shell with navigation

The `main` branch contains a **fully-featured application** with:
- ✅ Complete note/card management
- ✅ Anki integration
- ✅ AI card generation
- ✅ Coverage analysis
- ✅ Import/Export
- ✅ Full settings system

**Estimated effort to reach feature parity:** 10-15 days of development work, following the phased implementation plan above.