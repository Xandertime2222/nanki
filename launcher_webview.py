"""PyInstaller entry point for Nanki with native desktop window (PyWebView).

Wraps the FastAPI app in a native desktop window using pywebview, providing
a true desktop application experience without opening a browser.
"""
import sys
import os
import io
import socket
import threading
import time

# Fix for PyInstaller --windowed mode: stdout/stderr are None
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

# Ensure the package is importable when frozen
if getattr(sys, "frozen", False):
    sys.path.insert(0, sys._MEIPASS)

import uvicorn
import webview

from noteforge_anki_studio.app import app
from noteforge_anki_studio.config import SettingsManager


def _port_available(host: str, port: int) -> bool:
    """Check if a port is available for binding."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return True
        except OSError:
            return False


def _find_free_port(host: str, start: int, attempts: int = 20) -> int:
    """Find a free port starting from *start*."""
    for offset in range(attempts):
        port = start + offset
        if _port_available(host, port):
            return port
    raise RuntimeError(f"No free port found in range {start}–{start + attempts - 1}")


def _wait_for_server(host: str, port: int, timeout: float = 10.0) -> bool:
    """Block until the server accepts connections or timeout."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def start_server(host: str, port: int) -> None:
    """Run the FastAPI server (called in a daemon thread)."""
    uvicorn.run(app, host=host, port=port, log_level="warning")


def main() -> None:
    """Launch Nanki in a native desktop window."""
    settings_manager = SettingsManager()
    settings = settings_manager.load()

    host = settings.host or "127.0.0.1"
    port = settings.port or 7788

    # If the default port is taken, find the next free one
    if not _port_available(host, port):
        port = _find_free_port(host, port + 1)

    url = f"http://{host}:{port}"

    # Start FastAPI server in background thread
    server_thread = threading.Thread(target=start_server, args=(host, port), daemon=True)
    server_thread.start()

    # Wait until the server is ready before opening the window
    if not _wait_for_server(host, port):
        print(f"Warning: server did not respond at {url} within timeout", file=sys.stderr)

    # Create native desktop window
    webview.create_window(
        title="Nanki — Study Workspace",
        url=url,
        width=1400,
        height=900,
        min_size=(800, 500),
        resizable=True,
    )

    # Start the webview event loop (blocks until window is closed)
    webview.start(debug=False)


if __name__ == "__main__":
    main()
