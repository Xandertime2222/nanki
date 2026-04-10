#!/usr/bin/env python3
"""
Build script for Nanki Standalone (no local server).

Creates a single executable with all features of the main app.
"""

import PyInstaller.__main__
import platform
import sys
from pathlib import Path

# Project root
ROOT = Path(__file__).parent.resolve()

# Platform detection
IS_WINDOWS = sys.platform == "win32"
IS_MACOS = sys.platform == "darwin"
IS_LINUX = sys.platform.startswith("linux")

# Architecture
ARCH = "arm64" if IS_MACOS and platform.machine() == "arm64" else "x64"

# Output name
if IS_WINDOWS:
    OUTPUT_NAME = "Nanki-Standalone.exe"
elif IS_MACOS:
    OUTPUT_NAME = "Nanki-Standalone.app"
else:
    OUTPUT_NAME = "nanki-standalone"

# Build arguments
args = [
    str(ROOT / "standalone.py"),
    "--name", "Nanki-Standalone",
    "--onefile",
    "--windowed",
    "--clean",
    
    # Add icon
    "--icon", str(ROOT / "assets" / ("nanki-icon.ico" if IS_WINDOWS else "nanki-icon.icns")),
    
    # Add source files
    "--add-data", f"{ROOT / 'src' / 'noteforge_anki_studio'}:noteforge_anki_studio",
    "--add-data", f"{ROOT / 'src' / 'noteforge_anki_studio' / 'static'}:noteforge_anki_studio/static",
    "--add-data", f"{ROOT / 'src' / 'noteforge_anki_studio' / 'templates'}:noteforge_anki_studio/templates",
    "--add-data", f"{ROOT / 'assets'}:assets",
    
    # Hidden imports
    "--hidden-import", "webview",
    "--hidden-import", "webview.platforms.winforms",
    "--hidden-import", "webview.platforms.cocoa",
    "--hidden-import", "webview.platforms.gtk",
    "--hidden-import", "noteforge_anki_studio",
    "--hidden-import", "noteforge_anki_studio.app",
    "--hidden-import", "noteforge_anki_studio.ai",
    "--hidden-import", "noteforge_anki_studio.anki_connect",
    "--hidden-import", "noteforge_anki_studio.config",
    "--hidden-import", "noteforge_anki_studio.coverage",
    "--hidden-import", "noteforge_anki_studio.exporters",
    "--hidden-import", "noteforge_anki_studio.importers",
    "--hidden-import", "noteforge_anki_studio.models",
    "--hidden-import", "noteforge_anki_studio.storage",
    "--hidden-import", "mistune",
    "--hidden-import", "markdownify",
    "--hidden-import", "fitz",  # PyMuPDF
    
    # Collect all submodules
    "--collect-all", "noteforge_anki_studio",
    
    # Output
    "--distpath", str(ROOT / "dist-standalone"),
    "--workpath", str(ROOT / "build-standalone"),
    "--specpath", str(ROOT),
    
    # No console
    "--noconsole",
]

# Platform-specific options
if IS_MACOS:
    args.extend([
        "--osx-bundle-identifier", "com.nanki.standalone",
        "--target-arch", "arm64" if platform.machine() == "arm64" else "x86_64",
    ])

if IS_WINDOWS:
    args.extend([
        "--uac-admin",  # Request admin for installer
    ])

print("=" * 60)
print("Building Nanki Standalone")
print("=" * 60)
print(f"Platform: {sys.platform}")
print(f"Architecture: {ARCH}")
print(f"Output: {ROOT / 'dist-standalone' / OUTPUT_NAME}")
print("=" * 60)

PyInstaller.__main__.run(args)

print("\n" + "=" * 60)
print("Build complete!")
print(f"Output: {ROOT / 'dist-standalone' / OUTPUT_NAME}")
print("=" * 60)