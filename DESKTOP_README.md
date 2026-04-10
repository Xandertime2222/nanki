# Nanki Desktop Application

**Nanki** is a local-first study workspace that combines note-taking with flashcard creation and AI-powered learning assistance.

## Features

- 📝 **Rich Markdown Editor** - Write beautiful notes with real-time preview
- ⚡ **Instant Flashcards** - Create cards from selected text
- 🤖 **AI-Powered** - Generate cards and get explanations
- 📊 **Coverage Analysis** - Track your learning progress
- 🌍 **Bilingual** - German and English interface
- 🔌 **Anki Integration** - Sync with your Anki decks

## System Requirements

### Windows
- Windows 10 or later (64-bit)
- 2 GB RAM minimum
- 500 MB disk space

### macOS
- macOS 10.15 (Catalina) or later
- Apple Silicon (M1/M2/M3) or Intel
- 2 GB RAM minimum
- 500 MB disk space

## Installation

### Windows

1. Download `Nanki-X.X.X-Windows-Setup.exe` from the [Releases page](https://github.com/Xandertime2222/nanki/releases)
2. Run the installer
3. Launch Nanki from the Start Menu or Desktop

### macOS

1. Download `Nanki-X.X.X-macOS-arm64.dmg` from the [Releases page](https://github.com/Xandertime2222/nanki/releases)
2. Open the DMG file
3. Drag Nanki to your Applications folder
4. Launch from Applications

**Note for macOS:** If you see a warning about an unidentified developer:
- Right-click (or Control-click) the app
- Select "Open" from the context menu
- Click "Open" in the dialog

## First Steps

1. **Create your first note** - Click "New note" or press `Ctrl+N` / `Cmd+N`
2. **Start writing** - Type in Markdown format
3. **Create flashcards** - Select text and click "Basic" or "Cloze"
4. **Sync to Anki** - Install [AnkiConnect](https://github.com/FooSoft/anjiconnect) and configure in Settings

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `Cmd+N` | New note |
| `Ctrl+S` / `Cmd+S` | Save note |
| `Ctrl+O` / `Cmd+O` | Search notes |
| `Ctrl+F` / `Cmd+F` | Search notes |
| `Ctrl+B` / `Cmd+B` | Bold text |
| `Ctrl+I` / `Cmd+I` | Italic text |
| `Escape` | Close dialogs |

## Data Storage

Nanki stores your notes locally:

- **Windows:** `%APPDATA%\Nanki\workspace\`
- **macOS:** `~/Library/Application Support/Nanki/workspace/`

Your notes are saved as standard Markdown files, making them portable and future-proof.

## Configuration

Access Settings via the gear icon in the top-right corner:

- **Workspace Path** - Change where notes are stored
- **Language** - Switch between English and German
- **AnkiConnect** - Configure Anki integration
- **AI Features** - Enable AI-powered card generation

## Troubleshooting

### App won't start
- Check if another instance is already running
- Verify your system meets the requirements
- Check the logs in the application data directory

### Anki sync not working
- Ensure Anki is running
- Install the [AnkiConnect](https://github.com/FooSoft/anjiconnect) add-on
- Verify the URL in Settings (default: `http://127.0.0.1:8765`)

### Port already in use
Nanki will automatically find an alternative port if 7788 is occupied.

## Updates

Nanki checks for updates on startup. Download and install new versions manually from the [Releases page](https://github.com/Xandertime2222/nanki/releases).

## Support

- **Documentation:** [GitHub Wiki](https://github.com/Xandertime2222/nanki/wiki)
- **Issues:** [GitHub Issues](https://github.com/Xandertime2222/nanki/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Xandertime2222/nanki/discussions)

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Nanki** - Study smarter. Remember longer.
