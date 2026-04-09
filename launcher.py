"""PyInstaller entry point for Nanki.

This wrapper script handles the import correctly when packaged as an executable.
"""
import sys
import os
import io

# Fix for PyInstaller --windowed mode: uvicorn tries to check if stdout is a tty,
# but in windowed mode stdout is None. We provide a dummy stream.
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

# Ensure the package is importable
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    bundle_dir = sys._MEIPASS
    sys.path.insert(0, bundle_dir)

from noteforge_anki_studio.__main__ import main

if __name__ == "__main__":
    main()