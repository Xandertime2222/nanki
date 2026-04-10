"""PyInstaller entry point for Nanki with native desktop window (PyWebView).

Wraps the FastAPI app in a native desktop window using pywebview, providing
a true desktop application experience without opening a browser.
"""

from __future__ import annotations

import io
import logging
import os
import socket
import sys
import threading
import time
from pathlib import Path

import uvicorn
import webview

# Configure logging for desktop app
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("Nanki")

# Handle frozen executable paths
if getattr(sys, "frozen", False):
    sys.path.insert(0, sys._MEIPASS)
    # Set up application data directory
    if sys.platform == "win32":
        app_data = Path(os.environ.get("APPDATA", "")) / "Nanki"
    elif sys.platform == "darwin":
        app_data = Path.home() / "Library" / "Application Support" / "Nanki"
    else:
        app_data = Path.home() / ".config" / "nanki"
    app_data.mkdir(parents=True, exist_ok=True)
    os.environ["NANKI_DATA_DIR"] = str(app_data)

# Redirect stdout/stderr for windowed mode
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()


def _port_available(host: str, port: int) -> bool:
    """Check if a port is available for binding."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, port))
            return True
        except OSError:
            return False


def _find_free_port(host: str, start: int, attempts: int = 50) -> int:
    """Find a free port starting from *start*."""
    for offset in range(attempts):
        port = start + offset
        if _port_available(host, port):
            logger.info(f"Using port {port}")
            return port
    raise RuntimeError(f"No free port found in range {start}–{start + attempts - 1}")


def _wait_for_server(host: str, port: int, timeout: float = 15.0) -> bool:
    """Block until the server accepts connections or timeout."""
    deadline = time.monotonic() + timeout
    attempts = 0
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                logger.info(f"Server ready at {host}:{port} after {attempts} attempts")
                return True
        except OSError:
            attempts += 1
            time.sleep(0.2)
    return False


def start_server(host: str, port: int) -> None:
    """Run the FastAPI server (called in a daemon thread)."""
    try:
        logger.info(f"Starting server on {host}:{port}")
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="warning",
            access_log=False,
            workers=1,
        )
    except Exception as e:
        logger.error(f"Server failed to start: {e}")
        raise


def show_error(message: str) -> None:
    """Show error dialog to user."""
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        messagebox.showerror("Nanki Error", message)
        root.destroy()
    except Exception:
        print(f"ERROR: {message}", file=sys.stderr)


def main() -> int:
    """Launch Nanki in a native desktop window."""
    try:
        logger.info("Starting Nanki desktop application")

        # Import after logging is set up
        from noteforge_anki_studio.app import app
        from noteforge_anki_studio.config import SettingsManager

        settings_manager = SettingsManager()
        settings = settings_manager.load()

        host = settings.host or "127.0.0.1"
        port = settings.port or 7788

        # If the default port is taken, find the next free one
        if not _port_available(host, port):
            logger.warning(f"Port {port} is in use, finding alternative")
            port = _find_free_port(host, port + 1)

        url = f"http://{host}:{port}"

        # Start FastAPI server in background thread
        server_thread = threading.Thread(
            target=start_server, args=(host, port), daemon=True
        )
        server_thread.start()

        # Wait until the server is ready before opening the window
        logger.info(f"Waiting for server to be ready at {url}")
        if not _wait_for_server(host, port):
            error_msg = f"Failed to start server at {url}. Please check if another instance is running."
            logger.error(error_msg)
            show_error(error_msg)
            return 1

        # Determine window icon
        icon_path = None
        if getattr(sys, "frozen", False):
            if sys.platform == "win32":
                icon_path = os.path.join(sys._MEIPASS, "assets", "nanki-icon.ico")
            elif sys.platform == "darwin":
                icon_path = os.path.join(sys._MEIPASS, "assets", "nanki-icon.icns")

        # Create native desktop window with better defaults
        window = webview.create_window(
            title="Nanki — Study Workspace",
            url=url,
            icon_path=icon_path,
            width=1400,
            height=900,
            min_size=(900, 600),
            resizable=True,
            fullscreen=False,
            text_select=True,
            background_color="#09090b" if webview.platforms.winforms else "#ffffff",
        )

        # Handle window events
        def on_closing():
            logger.info("Application closing")
            return True

        window.events.closing += on_closing

        logger.info("Opening application window")
        # Start the webview event loop (blocks until window is closed)
        webview.start(debug=False, gui="qt" if sys.platform == "darwin" else None)

        logger.info("Application exited successfully")
        return 0

    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        show_error(
            f"Nanki failed to start:\n{str(e)}\n\nPlease check the logs for details."
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
