"""PyInstaller entry point for Nanki with native desktop window (PyWebView).

This version wraps the FastAPI app in a native desktop window using pywebview,
providing a true desktop application experience without opening a browser.
"""
import sys
import os
import io
import threading

# Fix for PyInstaller --windowed mode
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

# Ensure the package is importable
if getattr(sys, 'frozen', False):
    bundle_dir = sys._MEIPASS
    sys.path.insert(0, bundle_dir)

import uvicorn
import webview

from noteforge_anki_studio.app import app
from noteforge_anki_studio.config import SettingsManager


def start_server():
    """Start the FastAPI server in a background thread."""
    settings_manager = SettingsManager()
    settings = settings_manager.load()
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="warning")


def main():
    """Launch Nanki in a native desktop window."""
    settings_manager = SettingsManager()
    settings = settings_manager.load()
    url = f"http://{settings.host}:{settings.port}"
    
    # Start FastAPI server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Create native desktop window
    window = webview.create_window(
        title='Nanki - Study Workspace',
        url=url,
        width=1400,
        height=900,
        min_size=(900, 600),
        resizable=True,
        frame=True,
        easy_drag=False,
    )
    
    # Start the webview event loop (this blocks until window is closed)
    webview.start(debug=False)


if __name__ == "__main__":
    main()