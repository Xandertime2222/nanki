# Nanki

Nanki is a local-first study workspace that keeps notes and flashcards in one flow.

You write in a rich-text note editor, select text directly from notes or imported material, and turn it into flashcards without leaving the note. Notes are still stored as real Markdown files on disk, but the main UI hides raw Markdown while you work.

## Core ideas

- real note storage in `note.md`
- per-note flashcards in `cards.json`
- direct AnkiConnect push
- import for PDF, Markdown, plain text, and PowerPoint `.pptx`
- note coverage based on:
  - local Nanki cards
  - all cards available through AnkiConnect
- German / English interface
- minimal browser UI inspired by native macOS app patterns

## Project structure

```text
workspace/
  notes/
    <note-id>/
      note.md
      cards.json
      source-manifest.json
      source/
        original imported file
  exports/
    generated csv/txt/apkg files
```

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
nanki
```

Legacy command still works too:

```bash
noteforge-anki-studio
```

The app starts a local FastAPI server and opens in your browser.

Default URL:

```text
http://127.0.0.1:7788
```

## What is included

- rich note editor with Markdown storage in the background
- fast selection bubble for Basic / Cloze card creation
- card drawer for editing and pushing to Anki
- CSV, Anki text, and `.apkg` export
- settings overlay for:
  - workspace path
  - AnkiConnect URL
  - deck/model refresh
  - language selection
  - auto-sync
- coverage panel with:
  - overall percentage
  - section coverage
  - gaps
  - unmatched local cards
  - matching cards from the Anki library
  - inline coverage map

## Notes on AnkiConnect

Nanki negotiates the AnkiConnect API version at runtime and uses:

- `deckNames`
- `modelNames`
- `createDeck`
- `canAddNotes`
- `addNotes`
- `sync`
- `findCards`
- `cardsInfo`

The coverage workflow can enrich note coverage with the cards currently available in Anki. If Anki is offline, coverage falls back to the local Nanki cards only.

## Publish / package

```bash
python -m build
```

A desktop wrapper can be added with PyInstaller, Briefcase, or a native webview shell.

## License

MIT
