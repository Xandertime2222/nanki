# Nanki Standalone (No Server Version)

This is a complete standalone version of Nanki that runs entirely in-memory without starting a local HTTP server.

## Key Differences from Standard Nanki

| Feature | Standard Nanki | Standalone Nanki |
|---------|---------------|------------------|
| Backend | FastAPI + Uvicorn (HTTP server) | PyWebView JS Bridge |
| Communication | HTTP requests | Direct Python-JS bridge |
| Startup time | ~2 seconds | ~0.5 seconds |
| Memory usage | Higher (uvicorn process) | Lower (no separate server) |
| Port conflicts | Possible | None |
| Browser needed | Opens browser | Native window |

## All Features Included

✅ **Full feature parity with main Nanki:**
- Notes (create, edit, delete, pin, duplicate)
- Flashcards (Basic, Cloze)
- Coverage analysis
- Anki integration (AnkiConnect)
- AI features (Ollama, OpenRouter)
- Import (PDF, PPTX, MD, TXT)
- Export (APKG, CSV)
- Settings management

## Building

### Prerequisites

```bash
pip install pyinstaller pywebview
pip install -e ".[dev]"  # Install all dependencies
```

### Build Command

```bash
python build_standalone.py
```

Output:
- Windows: `dist-standalone/Nanki-Standalone.exe`
- macOS: `dist-standalone/Nanki-Standalone.app`
- Linux: `dist-standalone/nanki-standalone`

### Build Requirements

- Python 3.11+
- All dependencies from `pyproject.toml`
- PyInstaller 6.0+
- Platform-specific:
  - Windows: Visual C++ Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: GTK development files

## Development

### Running Standalone Locally

```bash
python standalone.py
```

### Architecture

```
standalone.py
    ├── NankiAPI (exposed to JavaScript)
    │   ├── get_settings() / update_settings()
    │   ├── list_notes() / create_note() / save_note() / delete_note()
    │   ├── get_coverage()
    │   ├── get_anki_decks() / push_to_anki()
    │   ├── ai_generate_cards() / ai_explain() / ai_chat()
    │   ├── import_file() / import_text()
    │   └── export_apkg() / export_csv()
    └── webview.create_window(html=template, js_api=NankiAPI)
```

### JavaScript API

All methods are called via `pywebview.api`:

```javascript
// Get notes
const notes = await pywebview.api.list_notes();

// Create note
const note = await pywebview.api.create_note('My Note');

// Generate AI cards
const result = await pywebview.api.ai_generate_cards(note_id, 5, 'basic');

// Push to Anki
const result = await pywebview.api.push_to_anki(note_id, cards, 'Default');
```

## Platform Notes

### Windows
- Uses WinForms backend
- Icon: `assets/nanki-icon.ico`
- Output: Single `.exe` file

### macOS
- Uses Cocoa backend
- Icon: `assets/nanki-icon.icns`
- Output: `.app` bundle

### Linux
- Uses GTK backend
- Requires: `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`
- Output: Single executable

## Troubleshooting

### Import Errors
If you see `ModuleNotFoundError`, add hidden imports to `build_standalone.py`:

```python
"--hidden-import", "module_name",
```

### Missing Files
Add data files:

```python
"--add-data", "source_path:destination_path",
```

### Slow Startup
This is normal for PyInstaller. The executable must extract bundled files on first run.

## License

Same as main Nanki project - MIT License.