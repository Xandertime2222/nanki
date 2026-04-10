"""PyInstaller entry point for Nanki with native desktop window.

This wrapper script provides dummy streams for windowed mode and launches
the app in a native desktop window using pywebview.
"""

from __future__ import annotations

import io
import sys

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

if getattr(sys, "frozen", False):
    sys.path.insert(0, sys._MEIPASS)

from noteforge_anki_studio.__main__ import main

if __name__ == "__main__":
    main()
