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

# Global server instance for cleanup
_server_instance = None


def _is_port_in_use(host: str, port: int) -> bool:
    """Check if a port is already in use by trying to connect."""
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


def _port_can_bind(host: str, port: int) -> bool:
    """Check if we can bind to a port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            # On Windows, SO_REUSEADDR has different behavior
            # We want to check if the port is truly available
            if sys.platform == "win32":
                # Don't use SO_REUSEADDR for the check on Windows
                s.bind((host, port))
            else:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((host, port))
            return True
        except OSError:
            return False


def _find_free_port(host: str, start: int, attempts: int = 100) -> int:
    """Find a free port starting from *start*."""
    for offset in range(attempts):
        port = start + offset
        # First check if port is already in use (someone listening)
        if _is_port_in_use(host, port):
            logger.info(f"Port {port} is already in use, skipping...")
            continue
        # Then check if we can bind to it
        if _port_can_bind(host, port):
            logger.info(f"Found free port: {port}")
            return port
    raise RuntimeError(f"No free port found in range {start}–{start + attempts - 1}")


def _wait_for_server(host: str, port: int, timeout: float = 30.0) -> bool:
    """Block until the server accepts connections or timeout."""
    deadline = time.monotonic() + timeout
    attempts = 0
    last_error = None
    
    while time.monotonic() < deadline:
        attempts += 1
        try:
            with socket.create_connection((host, port), timeout=1.0):
                logger.info(f"Server ready at {host}:{port} after {attempts} attempts")
                return True
        except OSError as e:
            last_error = e
            time.sleep(0.3)
    
    logger.error(f"Server failed to start after {timeout}s: {last_error}")
    return False


def start_server(host: str, port: int) -> None:
    """Run the FastAPI server (called in a daemon thread)."""
    global _server_instance
    try:
        logger.info(f"Starting uvicorn server on {host}:{port}")
        
        # Configure uvicorn with proper logging
        config = uvicorn.Config(
            app,
            host=host,
            port=port,
            log_level="warning",
            access_log=False,
            workers=1,
        )
        _server_instance = uvicorn.Server(config)
        _server_instance.run()
        
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
        logger.info(f"Platform: {sys.platform}")
        logger.info(f"Python: {sys.version}")

        # Import after logging is set up
        from noteforge_anki_studio.app import app
        from noteforge_anki_studio.config import SettingsManager

        settings_manager = SettingsManager()
        settings = settings_manager.load()

        host = settings.host or "127.0.0.1"
        default_port = settings.port or 7788
        
        logger.info(f"Default port from settings: {default_port}")

        # Find a free port (more robust check)
        port = _find_free_port(host, default_port)
        
        if port != default_port:
            logger.warning(f"Port {default_port} unavailable, using port {port}")

        url = f"http://{host}:{port}"

        # Start FastAPI server in background thread
        server_thread = threading.Thread(
            target=start_server, args=(host, port), daemon=True
        )
        server_thread.start()

        # Wait until the server is ready before opening the window
        logger.info(f"Waiting for server to be ready at {url}")
        if not _wait_for_server(host, port, timeout=30.0):
            error_msg = f"Failed to start server at {url}.\n\nThis usually means:\n1. Another Nanki instance is already running\n2. A firewall is blocking the connection\n\nPlease close any running Nanki instances and try again."
            logger.error(error_msg)
            show_error(error_msg)
            return 1

        logger.info(f"Server is ready, opening window")

        # Determine window icon
        icon_path = None
        if getattr(sys, "frozen", False):
            if sys.platform == "win32":
                icon_path = os.path.join(sys._MEIPASS, "assets", "nanki-icon.ico")
            elif sys.platform == "darwin":
                icon_path = os.path.join(sys._MEIPASS, "assets", "nanki-icon.icns")
        else:
            # Development mode
            base_path = Path(__file__).parent / "assets"
            if sys.platform == "win32":
                icon_path = str(base_path / "nanki-icon.ico")
            elif sys.platform == "darwin":
                icon_path = str(base_path / "nanki-icon.icns")

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
            background_color="#09090b" if sys.platform == "win32" else "#ffffff",
        )

        # Handle window events
        def on_closing():
            logger.info("Application closing, stopping server...")
            # Server is daemon thread, will be killed automatically
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