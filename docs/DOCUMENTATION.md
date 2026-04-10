# Nanki Documentation

> **Full documentation is available in the [Wiki](https://github.com/Xandertime2222/nanki/wiki)** (once enabled).

## Quick Links

| Topic | Description |
|-------|-------------|
| [Installation](#installation) | Download and setup |
| [First Steps](#first-steps) | Create your first note |
| [Flashcards](#flashcards) | Create and sync cards |
| [AI Features](#ai-features) | Auto-generate content |
| [Anki Integration](#anki-integration) | Sync with Anki |
| [Troubleshooting](#troubleshooting) | Common issues |

---

## Installation

### Desktop Apps (Recommended)

Download the latest release for your platform:

| Platform | Download | Size |
|----------|----------|------|
| **Windows** | [Nanki-Desktop-Setup-v0.5.exe](https://github.com/Xandertime2222/nanki/releases/download/v0.5/Nanki-Desktop-Setup-v0.5.exe) | ~47 MB |
| **macOS (Apple Silicon)** | [Nanki-macOS-arm64-v0.5.dmg](https://github.com/Xandertime2222/nanki/releases/download/v0.5/Nanki-macOS-arm64-v0.5.dmg) | ~47 MB |

### From Source

```bash
git clone https://github.com/Xandertime2222/nanki.git
cd nanki
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
nanki
```

---

## First Steps

### 1. Choose a Workspace

On first launch, select a folder where Nanki will store your data:

```
workspace/
└── notes/
    └── my-note/
        ├── note.md              # Your note (Markdown)
        ├── cards.json           # Flashcards
        └── source/
            └── original.pdf     # Imported files
```

> **Tip:** Use a folder synced with Dropbox or Git for automatic backups.

### 2. Create a Note

1. Click **"New Note"**
2. Write in Markdown
3. Press `Ctrl+S` to save

### 3. Create Flashcards

1. Select text in your note
2. Click **Basic** (front/back) or **Cloze** (fill-in-the-blank)
3. Edit in the card drawer
4. Push to Anki

---

## Flashcards

### Card Types

| Type | Format | Example |
|------|--------|---------|
| **Basic** | Front → Back | Q: Capital of France? → A: Paris |
| **Cloze** | Fill-in-the-blank | The capital of France is {{c1::Paris}}. |

### Push to Anki

1. Ensure Anki is running
2. Install AnkiConnect (code: 2055492159)
3. Click **"Push to Anki"** in Nanki

---

## AI Features

### Setup

1. Go to Settings (⚙️)
2. Choose a provider:
   - **Ollama** (local, free) - Run `ollama serve`
   - **OpenRouter** (cloud) - Add your API key

### Auto-Generate Cards

1. Open a note
2. Click **"AI: Generate Cards"**
3. Review and edit the generated cards

### Explain

1. Select text in your note
2. Click **"Explain"**
3. AI provides a detailed explanation

### Chat

Use the chat panel to ask questions about your notes.

---

## Anki Integration

### Setup

1. Install [Anki Desktop](https://apps.ankiweb.net)
2. Go to Tools → Add-ons → Get Add-ons
3. Enter code: `2055492159`
4. Restart Anki

### Connection

In Nanki Settings:
- AnkiConnect URL: `http://127.0.0.1:8765`

### Sync

Click **"Sync"** to include your Anki library in coverage analysis.

---

## Troubleshooting

### AnkiConnect Not Found

1. Ensure Anki is running
2. Verify AnkiConnect is installed
3. Check the URL in Settings

### AI Not Responding

**Ollama:**
```bash
ollama serve
ollama pull llama3
```

**OpenRouter:**
- Check your API key
- Verify you have credits

### Notes Not Saving

- Check workspace folder permissions
- Ensure folder is writable

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+S` | Save |
| `Ctrl+E` | Edit note |
| `Ctrl+P` | Toggle pin |
| `Ctrl+F` | Search |
| `Esc` | Clear selection |

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Xandertime2222/nanki/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Xandertime2222/nanki/discussions)

---

*Last updated: April 2026*