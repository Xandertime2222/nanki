# Nanki Desktop — Build & Run Guide

## Prerequisites

- **Node.js** 20+
- **Python** 3.13+
- **Rust** (stable, MSVC target on Windows) — only needed for Tauri desktop packaging
- **Git**

## Quick Start

```bash
# 1. Install frontend dependencies
cd apps/desktop
npm install --install-strategy=shallow

# 2. Install Python backend dependencies
cd ../../backend/python-core
pip install -r requirements.txt

# 3. Run frontend dev server (browser)
cd ../../apps/desktop
npm run dev
# → http://localhost:1420

# 4. Start Python backend separately (for dev)
cd ../../backend/python-core
python run.py
# → http://localhost:8642/health
```

## Running the Desktop App (Tauri)

```bash
cd apps/desktop

# Dev mode (starts Vite + Tauri window)
npm run tauri:dev

# Production build
npm run tauri:build
```

The Tauri app automatically spawns the Python backend as a sidecar process on startup.

> **Note:** `tauri dev` / `tauri build` requires the Rust toolchain with the MSVC target on Windows. Install via [rustup.rs](https://rustup.rs).

## Testing

### Frontend Unit Tests (vitest)
```bash
cd apps/desktop
npm test            # single run
npm run test:watch  # watch mode
```

### Frontend E2E Tests (Playwright)
```bash
cd apps/desktop
npm run test:e2e
```

### Python Backend Tests (pytest)
```bash
cd backend/python-core
python -m pytest tests/ -v
```

### All Tests Summary
| Suite | Tool | Count | Command |
|-------|------|-------|---------|
| Frontend unit | vitest | 43 | `npm test` |
| Frontend E2E | Playwright | 11 | `npm run test:e2e` |
| Python backend | pytest | 2 | `python -m pytest` |

## CI

A GitHub Actions workflow runs on every push:
- Frontend tests (vitest)
- Frontend build
- Frontend E2E (Playwright + Chromium)
- Python backend tests (pytest)

See `.github/workflows/ci.yml`.

## Architecture

```
apps/desktop/             → Tauri + React + Vite frontend
  src/                    → React app
    components/           → AppShell, Sidebar, CommandPalette, UI primitives
    features/             → Workspace, Import, Library, Analysis, Review, Settings
    stores/               → Zustand state (app, notes)
    lib/                  → API client, utility functions
    styles/               → Tailwind CSS + design tokens
    test/                  → Test setup and polyfills
  src-tauri/              → Rust sidecar manager (spawns Python, health check)
  e2e/                    → Playwright specs

backend/python-core/      → FastAPI backend (sidecar)
  nanki_core/             → API routes and app setup
  tests/                  → pytest specs
```

## Platform Notes

- **Windows:** Rust MSVC target required (`rustup default stable-x86_64-pc-windows-msvc`)
- **macOS/Linux:** Standard `rustup` installation works
- Python backend binds to `localhost:8642` (configurable via `NANKI_PORT` env var)
- Frontend dev server runs on port `1420`