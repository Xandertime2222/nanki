<!-- Nanki Header -->
<div align="center">

<img src="assets/nanki-logo.svg" alt="Nanki Logo" width="150">

# Nanki

**Local-first study workspace.**

Notes, flashcards & AI — in one seamless flow.

[![GitHub Release](https://img.shields.io/github/v/release/Xandertime2222/nanki?include_prereleases&style=for-the-badge)](https://github.com/Xandertime2222/nanki/releases)
[![GitHub Downloads](https://img.shields.io/github/downloads/Xandertime2222/nanki/total?style=for-the-badge)](https://github.com/Xandertime2222/nanki/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge)](https://www.python.org)

[📥 Download](#-installation) · [📖 Documentation](#-usage) · [🤝 Contributing](#-contributing) · [❓ Support](#-support)

---

</div>

## 📖 About

Nanki is a **local-first** study application that combines note-taking, flashcard creation, and AI-powered learning in one seamless experience. Write notes in Markdown, create flashcards instantly, and sync with Anki — all while keeping your data private on your machine.

### Why Nanki?

| Feature | Nanki | Traditional Tools |
|---------|-------|-------------------|
| 📝 Markdown Notes | ✅ Real `.md` files | ❌ Proprietary formats |
| 🔄 Anki Sync | ✅ One-click sync | ❌ Manual export/import |
| 🤖 AI Integration | ✅ Chat, explain, generate | ❌ Manual card creation |
| 📊 Coverage Analysis | ✅ Know what you've studied | ❌ No progress tracking |
| 🔒 Privacy | ✅ Everything local | ❌ Cloud-dependent |
| 🌐 Offline | ✅ Works offline | ❌ Requires internet |

---

## 📸 Screenshots

<div align="center">

| Note Editor | Flashcard Creation | AI Chat |
|-------------|-------------------|---------|
| ![Editor](docs/screenshots/editor.png) | ![Cards](docs/screenshots/cards.png) | ![AI](docs/screenshots/ai.png) |

</div>

---

## ✨ Features

### ✍️ Rich Note Editor
- Write in a clean, distraction-free interface
- **Real Markdown storage** — your notes live as `.md` files on disk
- Import from **PDF, Markdown, plain text, PowerPoint (.pptx)**
- Full-text search across all your notes

### ⚡ Instant Flashcards
- Select any text → create **Basic** or **Cloze** cards instantly
- Cards are linked to source excerpts for context
- Push directly to **Anki** via AnkiConnect
- Export as `.apkg`, CSV, or Anki text format

### 🤖 AI-Powered Learning
- **Chat** with your notes using OpenAI-compatible APIs
- Get **explanations** for selected text
- **Auto-generate** flashcards from notes (with coverage-aware context)
- Support for local LLMs via compatible endpoints

### 📊 Coverage Analysis
- Know exactly what you've covered: percentage, sections, gaps
- Matches local Nanki cards + your entire Anki library
- Works offline with local cards only

### 🌍 Bilingual Interface
- **Deutsch & English** — switch anytime
- Language-aware AI interactions

### 🖥️ Desktop Apps
- Native applications for **Windows** and **macOS**
- System integration with file associations
- Automatic updates

---

## 📥 Installation

### Desktop Apps (Recommended)

Download the latest release for your platform:

| Platform | Download | Size |
|----------|----------|------|
| **Windows** | [Nanki-Desktop-Setup-v0.5.exe](https://github.com/Xandertime2222/nanki/releases/download/v0.5/Nanki-Desktop-Setup-v0.5.exe) | ~47 MB |
| **macOS (Apple Silicon)** | [Nanki-macOS-arm64-v0.5.dmg](https://github.com/Xandertime2222/nanki/releases/download/v0.5/Nanki-macOS-arm64-v0.5.dmg) | ~47 MB |

### From Source

<details>
<summary>Click to expand</summary>

```bash
# Clone the repository
git clone https://github.com/Xandertime2222/nanki.git
cd nanki

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Nanki
pip install -e .

# Launch
nanki
```

The app starts at `http://127.0.0.1:7788` and opens automatically in your browser.

</details>

### Requirements

- **Python 3.11+** (for source installation)
- **Anki** (optional, for sync) with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed

---

## 🚀 Usage

### Your First Note

Nanki stores notes in a simple folder structure:

```
workspace/
└── notes/
    └── my-first-note/
        ├── note.md              # Your Markdown note
        ├── cards.json           # Associated flashcards
        ├── source-manifest.json # Import metadata
        └── source/
            └── original.pdf     # Imported files (optional)
```

### Creating Flashcards

1. **Open a note** and select text you want to learn
2. **Click the selection bubble** that appears
3. Choose **Basic** (front/back) or **Cloze** (fill-in-the-blank)
4. Edit in the card drawer if needed
5. **Push to Anki** or export as `.apkg`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save note |
| `Ctrl/Cmd + F` | Search |
| `Ctrl/Cmd + N` | New note |
| `Ctrl/Cmd + E` | Export |

### AI Features

Enable AI via Settings (⚙️ icon) by providing your OpenAI API key or a compatible endpoint.

| Feature | Description |
|---------|-------------|
| **Chat** | Ask questions about your notes |
| **Explain** | Get clarifications for selected text |
| **Generate Cards** | Auto-create flashcards with smart coverage |

---

## 🔗 Anki Integration

Nanki integrates seamlessly with Anki via AnkiConnect:

| API Endpoint | Purpose |
|--------------|---------|
| `deckNames` | List available decks |
| `createDeck` | Create new decks on demand |
| `addNotes` | Push cards to Anki |
| `findCards` / `cardsInfo` | Coverage analysis |
| `sync` | Trigger Anki sync |

**Anki offline?** No problem — coverage analysis falls back to local Nanki cards only.

---

## 🛠️ Development

### Setup

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Linting
ruff check .

# Type checking
mypy src/
```

### Project Structure

```
nanki/
├── src/noteforge_anki_studio/
│   ├── app.py              # FastAPI application
│   ├── static/             # CSS, JS, logo
│   ├── templates/          # HTML templates
│   ├── ai.py               # AI service
│   ├── anki_connect.py     # AnkiConnect client
│   ├── coverage.py         # Coverage analysis
│   ├── exporters.py        # CSV, txt, apkg export
│   ├── importers.py        # PDF, PPTX, MD import
│   ├── models.py           # Pydantic models
│   ├── storage.py          # File-based storage
│   └── config.py           # Settings management
├── tests/
├── pyproject.toml
├── README.md
└── LICENSE
```

### Code Quality

This project uses:
- **Ruff** for linting and formatting
- **MyPy** for type checking
- **Pytest** for testing

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to update tests as appropriate.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses open-source libraries with compatible licenses. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for details.

> **Note:** PyMuPDF is licensed under AGPL-3.0. For desktop use (this project), this does not impose additional obligations. If you plan to offer Nanki as a network service, please review PyMuPDF's licensing terms or replace it with an MIT/BSD-licensed alternative.

---

## 🙏 Acknowledgments

- [Anki](https://apps.ankiweb.net) — The best spaced repetition system
- [FastAPI](https://fastapi.tiangolo.com) — Modern, fast web framework
- [Pydantic](https://pydantic-docs.helpmanual.io) — Data validation
- [PyWebView](https://pywebview.flowrl.com) — Desktop application wrapper

---

## 📮 Support

- **Bug Reports:** [GitHub Issues](https://github.com/Xandertime2222/nanki/issues)
- **Feature Requests:** [GitHub Discussions](https://github.com/Xandertime2222/nanki/discussions)
- **Security Issues:** Please report privately via email

---

<div align="center">

**[⬆ Back to Top](#nanki)**

Made with ❤️ by the Nanki Project

</div>