#!/usr/bin/env python3
"""
Build script for Nanki Standalone (no local server).

This creates a single executable that runs entirely in-memory without
starting an HTTP server.
"""

import PyInstaller.__main__
import sys
from pathlib import Path

# Project root
ROOT = Path(__file__).parent

# Build arguments
args = [
    str(ROOT / "standalone.py"),
    "--name", "Nanki-Standalone",
    "--onefile",
    "--windowed",
    "--clean",
    
    # Add icon
    "--icon", str(ROOT / "assets" / "nanki-icon.ico"),
    
    # Add data files
    "--add-data", f"{ROOT / 'src' / 'noteforge_anki_studio' / 'static'}:noteforge_anki_studio/static",
    "--add-data", f"{ROOT / 'assets'}:assets",
    
    # Hidden imports
    "--hidden-import", "webview",
    "--hidden-import", "webview.platforms.winforms",
    
    # Exclude unnecessary modules
    "--exclude-module", "matplotlib",
    "--exclude-module", "PIL",
    "--exclude-module", "numpy",
    "--exclude-module", "pandas",
    
    # Output
    "--distpath", str(ROOT / "dist-standalone"),
    "--workpath", str(ROOT / "build-standalone"),
    
    # Console mode (windowed)
    "--noconsole",
]

if sys.platform == "darwin":
    # macOS specific
    args.extend([
        "--osx-bundle-identifier", "com.nanki.app",
        "--icon", str(ROOT / "assets" / "nanki-icon.icns"),
    ])

print("Building Nanki Standalone...")
print("Args:", " ".join(args))

PyInstaller.__main__.run(args)

print("\nBuild complete!")
print(f"Output: {ROOT / 'dist-standalone' / 'Nanki-Standalone.exe'}")