# Nanki Standalone (No Server Version)

This is an experimental standalone version of Nanki that runs entirely in-memory without starting a local HTTP server.

## How It Works

Instead of running a FastAPI server, this version uses PyWebView's JavaScript Bridge to communicate directly between the frontend (HTML/JS) and Python backend.

### Architecture Comparison

| Feature | Standard Nanki | Standalone Nanki |
|---------|---------------|------------------|
| Backend | FastAPI (HTTP server) | PyWebView JS Bridge |
| Communication | HTTP requests | JavaScript Bridge |
| Startup time | ~2 seconds | ~0.5 seconds |
| Memory usage | Higher (uvicorn) | Lower (no uvicorn) |
| Port conflicts | Possible | None |

## Building

```bash
# Install dependencies
pip install pyinstaller pywebview

# Build standalone version
python build_standalone.py
```

Output: `dist-standalone/Nanki-Standalone.exe` (Windows) or `dist-standalone/Nanki-Standalone` (macOS)

## Current Status

⚠️ **Experimental** - This is a proof-of-concept. Features are limited:

- ✅ Note creation/editing
- ✅ Basic file operations
- ⚠️ Limited UI (simplified)
- ❌ No AI features yet
- ❌ No Anki integration yet
- ❌ No coverage analysis yet

## Files

| File | Purpose |
|------|---------|
| `standalone.py` | Main application (no HTTP server) |
| `build_standalone.py` | PyInstaller build script |

## Adding Features

To add features to the standalone version, implement them in the `NankiAPI` class:

```python
class NankiAPI:
    def my_feature(self, arg1: str) -> dict:
        """Description of what this does."""
        # Python code here
        return {"result": "value"}
```

Then call from JavaScript:

```javascript
const result = await pywebview.api.my_feature('value');
```

## License

Same as main Nanki project - MIT License.