# Contributing to Nanki

Thank you for considering contributing to Nanki! This document provides guidelines for contributing.

## Development Setup

1. **Fork and clone** the repository
2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```
3. **Install in development mode**:
   ```bash
   pip install -e ".[dev]"
   ```
4. **Install pre-commit hooks** (optional but recommended):
   ```bash
   pip install pre-commit
   pre-commit install
   ```

## Code Style

- **Formatting**: Ruff (configured in `pyproject.toml`)
- **Type hints**: Required for all function signatures
- **Line length**: 88 characters (Black-compatible)
- **Imports**: Sorted automatically by Ruff

## Running Tests

```bash
pytest tests/
```

## Linting & Type Checking

```bash
# Linting
ruff check .

# Type checking
mypy src/

# Auto-fix formatting
ruff check --fix .
ruff format .
```

## Pull Request Guidelines

1. **Small, focused PRs** are preferred
2. **Include tests** for new functionality
3. **Ensure all checks pass**:
   - Tests pass
   - Linting passes
   - Type checking passes
4. **Update documentation** if needed
5. **Follow existing code patterns** in the codebase

## Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Be concise but descriptive
- Reference issues when applicable

## Architecture Overview

Nanki consists of:
- **FastAPI backend** (`app.py`) - REST API
- **File-based storage** (`storage.py`) - Notes stored as Markdown + JSON
- **AnkiConnect integration** (`anki_connect.py`) - Sync with Anki
- **AI service** (`ai.py`) - LLM integration
- **Coverage analysis** (`coverage.py`) - Track study coverage
- **Importers/Exporters** - PDF, PPTX, Markdown, APKG, CSV

## Questions?

Open an issue for discussion before starting major changes.
