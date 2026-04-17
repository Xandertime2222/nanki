"""Auto-updater for Nanki desktop application.

Checks GitHub releases and downloads new versions automatically.
"""

from __future__ import annotations

import json
import logging
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger("Nanki.Updater")

GITHUB_API_URL = "https://api.github.com/repos/Xandertime2222/nanki/releases/latest"
GITHUB_REPO_URL = "https://github.com/Xandertime2222/nanki"

# Current version
from . import __version__ as CURRENT_VERSION


def parse_version(version_str: str) -> tuple:
    """Parse version string into comparable tuple."""
    try:
        # Remove 'v' prefix if present
        version_str = version_str.lstrip("v")
        return tuple(map(int, version_str.split(".")))
    except (ValueError, AttributeError):
        return (0, 0, 0)


def is_update_available() -> dict[str, Any]:
    """Check if a new version is available on GitHub."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(GITHUB_API_URL)
            response.raise_for_status()
            data = response.json()

            latest_version = data.get("tag_name", "").lstrip("v")
            current = parse_version(CURRENT_VERSION)
            latest = parse_version(latest_version)

            if latest > current:
                return {
                    "available": True,
                    "current_version": CURRENT_VERSION,
                    "latest_version": latest_version,
                    "release_url": data.get("html_url", GITHUB_REPO_URL),
                    "release_notes": data.get("body", ""),
                    "published_at": data.get("published_at", ""),
                    "assets": data.get("assets", []),
                }
            else:
                return {
                    "available": False,
                    "current_version": CURRENT_VERSION,
                    "latest_version": latest_version,
                    "message": "You are running the latest version.",
                }
    except httpx.HTTPError as e:
        logger.warning(f"Failed to check for updates: {e}")
        return {
            "available": False,
            "current_version": CURRENT_VERSION,
            "error": f"Could not check for updates: {e}",
        }
    except Exception as e:
        logger.warning(f"Update check failed: {e}")
        return {
            "available": False,
            "current_version": CURRENT_VERSION,
            "error": str(e),
        }


def get_asset_for_platform(assets: list[dict]) -> dict | None:
    """Find the appropriate download asset for current platform."""
    platform_map = {
        ("windows", "amd64"): ["windows", "win64", "x64"],
        ("windows", "arm64"): ["windows", "win-arm64", "arm64"],
        ("darwin", "amd64"): ["macos", "darwin", "mac", "x64", "intel"],
        ("darwin", "arm64"): ["macos", "darwin", "mac", "arm64", "m1", "m2"],
        ("linux", "amd64"): ["linux", "ubuntu", "x64"],
        ("linux", "arm64"): ["linux", "arm64", "aarch64"],
    }

    current_os = sys.platform
    current_arch = platform.machine().lower()

    # Map architecture names
    if current_arch in ("x86_64", "amd64"):
        current_arch = "amd64"
    elif current_arch in ("aarch64", "arm64"):
        current_arch = "arm64"

    keywords = platform_map.get((current_os, current_arch), [])

    for asset in assets:
        name = asset.get("name", "").lower()
        if any(kw in name for kw in keywords):
            return asset

    # Fallback: return first asset if no match
    return assets[0] if assets else None


def download_update(asset: dict, progress_callback=None) -> Path:
    """Download the update asset to a temporary location."""
    download_url = asset.get("browser_download_url")
    if not download_url:
        raise ValueError("No download URL available")

    temp_dir = Path(tempfile.mkdtemp(prefix="nanki_update_"))
    target_path = temp_dir / asset.get("name", "update.zip")

    try:
        with httpx.Client(timeout=300.0) as client:
            with client.stream("GET", download_url) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", 0))
                downloaded = 0

                with open(target_path, "wb") as f:
                    for chunk in response.iter_bytes(chunk_size=8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total > 0:
                            progress_callback(downloaded, total)

        return target_path
    except Exception as e:
        # Clean up on failure
        if target_path.exists():
            target_path.unlink()
        if temp_dir.exists():
            temp_dir.rmdir()
        raise e


def install_update_windows(archive_path: Path) -> bool:
    """Install update on Windows by replacing the executable."""
    if not getattr(sys, "frozen", False):
        logger.info("Not running as frozen executable, skipping install")
        return False

    exe_path = Path(sys.executable)
    backup_path = exe_path.with_suffix(".exe.backup")

    try:
        # Extract the executable from the archive
        with zipfile.ZipFile(archive_path, "r") as zf:
            # Find the main executable in the archive
            exe_name = None
            for name in zf.namelist():
                if name.endswith(".exe") and "nanki" in name.lower():
                    exe_name = name
                    break

            if not exe_name:
                raise ValueError("No executable found in update archive")

            # Create backup
            shutil.copy2(exe_path, backup_path)

            # Extract new version to temp location
            temp_exe = Path(tempfile.mktemp(suffix=".exe"))
            zf.extract(exe_name, temp_exe.parent)
            extracted_path = temp_exe.parent / exe_name
            shutil.move(str(extracted_path), str(temp_exe))

            # Schedule replacement on next run
            # Create a batch file to replace the executable
            batch_content = f'''
@echo off
timeout /t 2 /nobreak
del "{exe_path}"
move "{temp_exe}" "{exe_path}"
del "%~f0"
start "" "{exe_path}"
'''
            batch_path = Path(tempfile.mktemp(suffix=".bat"))
            batch_path.write_text(batch_content)

            # Run the batch file
            subprocess.Popen(
                ["cmd.exe", "/c", str(batch_path)],
                creationflags=subprocess.DETACHED_PROCESS
                | subprocess.CREATE_NEW_PROCESS_GROUP,
            )

            # Exit current process
            os._exit(0)

    except Exception as e:
        logger.error(f"Update installation failed: {e}")
        # Restore backup if it exists
        if backup_path.exists() and not exe_path.exists():
            shutil.move(str(backup_path), str(exe_path))
        raise e

    return True


def install_update_macos(archive_path: Path) -> bool:
    """Install update on macOS."""
    if not getattr(sys, "frozen", False):
        logger.info("Not running as frozen executable, skipping install")
        return False

    # macOS update would typically involve replacing the .app bundle
    # This is a simplified version - real implementation would need codesigning
    logger.warning("macOS auto-update not fully implemented yet")
    return False


def install_update(archive_path: Path) -> bool:
    """Install the downloaded update."""
    if sys.platform == "win32":
        return install_update_windows(archive_path)
    elif sys.platform == "darwin":
        return install_update_macos(archive_path)
    else:
        logger.warning(f"Auto-update not supported on {sys.platform}")
        return False


def check_and_notify(notify_callback) -> None:
    """Check for updates and notify via callback."""
    result = is_update_available()
    if notify_callback:
        notify_callback(result)
