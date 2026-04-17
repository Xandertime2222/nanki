# Main Branch → Tauri Branch: Feature Gap Analysis

## Completed Implementations
- ✅ Editor View with all main branch features (Quick Card Dock, Selection Bubble, Toolbar, Auto-save, Theme Toggle, Coverage View, Export, etc.)
- ✅ Settings View with full AI config (3 providers, model selects, prompts, all toggles)
- ✅ APCG Settings (analysis mode, Anki cards inclusion, auto-refresh, AI coverage)
- ✅ AnkiConnect settings (URL, auto-sync, deck/model discovery, connection test)
- ✅ Language settings (English / Deutsch)
- ✅ Update Checker
- ✅ Theme Toggle (light/dark/auto)
- ✅ Dark mode CSS variables support

## UI Components Created
- `src/features/editor/editor-view.jsx` - Full editor with ALL main branch features
- `src/features/settings/settings-view.jsx` - Complete settings with AI/APCG/Anki/Language

## Features Implemented in Editor View
1. Quick Card Dock - persistent dock with front/back inputs, save/push
2. Selection Bubble - popup on text select, Basic/Cloze/To Front/To Back
3. Editor Toolbar - Bold, Italic, H1-H3, List, Quote, Code, Clear
4. Auto-save with 850ms debounce
5. Save status indicator (Ready/Saving/Saved)
6. Theme toggle (light/dark/auto, localStorage)
7. Note search in sidebar
8. Note Details panel (hideable, tags/deck/pinned)
9. Duplicate + Delete from sidebar
10. Full Card Drawer (type, tags, extra, source locator)
11. Export cards (CSV, TXT, APKG)
12. Coverage analysis view toggle
13. Source viewer for imported content
14. Word count in status bar
15. Keyboard shortcuts (Ctrl+S, Ctrl+N, Ctrl+Shift+K, Ctrl+Shift+C, Escape)

## Features Implemented in Settings View
1. AI Features:
   - Enable/disable toggle
   - Provider selection (Ollama local, Ollama cloud, OpenRouter)
   - API URLs and keys for each provider
   - Auto-detect Ollama models
   - Model selection (default, chat, explain, flashcard, auto-flashcard)
   - Language (en/de)
   - Chat note-only toggle
   - Explain note-only toggle
   - Use Anki coverage context toggle
   - 4 AI prompts (chat, explain, flashcards, auto-flashcards)
   - Reset prompts button
   - Test AI connection
   - Model list display
2. APCG Analysis:
   - Default analysis mode (auto/history/science/vocabulary/universal)
   - Include Anki cards toggle
   - Auto-refresh toggle
   - Use AI coverage toggle
   - Reset APCG button
3. AnkiConnect:
   - URL configuration
   - Auto-sync toggle
   - Test connection
   - Refresh decks
   - Deck list display
   - Model list display
   - Version display
4. Language:
   - English / Deutsch selector
5. Updates:
   - Check for updates button
   - Download button (when available)
   - Release notes display
   - Version comparison
6. Theme:
   - Light / Dark / Auto toggle
   - Persists to localStorage

## Still TODO
- AI Chat/Explain/Generate Cards modal UI (main branch has full AI workspace)
- Onboarding modal (4-step welcome)
- Feature tour overlay
- Full i18n implementation across all views
- Dark mode CSS (CSS variables exist in main branch styles, need to add to Tauri)
- Source viewer full panel (imported source display)
- PDF preview for imported PDFs
- Card export UI with download links

## File Locations
- Editor: `apps/desktop/src/features/editor/editor-view.jsx`
- Settings: `apps/desktop/src/features/settings/settings-view.jsx`
- Stores: `apps/desktop/src/stores/` (notes-store, cards-store, app-store)
- API: `apps/desktop/src/lib/api.js`
- AI Service: `backend/python-core/nanki_core/ai.py`
- UI: `src/noteforge_anki_studio/static/app.js` (main branch reference)
- AI UI: `src/noteforge_anki_studio/static/ai_ui.js` (main branch reference)
- Styles: `src/noteforge_anki_studio/static/styles.css` (main branch CSS)
