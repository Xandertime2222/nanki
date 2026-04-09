from __future__ import annotations

import json
import shutil
from pathlib import Path

from .models import AppSettings

APP_DIR_NAME = ".nanki"
LEGACY_APP_DIR_NAME = ".noteforge-anki-studio"
SETTINGS_FILENAME = "settings.json"
DEFAULT_WORKSPACE_NAME = "NankiWorkspace"
LEGACY_WORKSPACE_NAME = "NoteForgeWorkspace"


def default_app_dir() -> Path:
    return Path.home() / APP_DIR_NAME


def legacy_app_dir() -> Path:
    return Path.home() / LEGACY_APP_DIR_NAME


def default_workspace() -> Path:
    legacy = Path.home() / LEGACY_WORKSPACE_NAME
    if legacy.exists():
        return legacy
    return Path.home() / DEFAULT_WORKSPACE_NAME


class SettingsManager:
    def __init__(self) -> None:
        self._app_dir = default_app_dir()
        self._settings_path = self._app_dir / SETTINGS_FILENAME
        self._app_dir.mkdir(parents=True, exist_ok=True)

        legacy_settings_path = legacy_app_dir() / SETTINGS_FILENAME
        if not self._settings_path.exists() and legacy_settings_path.exists():
            shutil.copy2(legacy_settings_path, self._settings_path)

        if not self._settings_path.exists():
            self.save(
                AppSettings(
                    workspace_path=str(default_workspace()),
                )
            )

    @property
    def settings_path(self) -> Path:
        return self._settings_path

    def load(self) -> AppSettings:
        data = json.loads(self._settings_path.read_text(encoding="utf-8"))
        settings = AppSettings.model_validate(data)
        workspace = Path(settings.workspace_path).expanduser()
        workspace.mkdir(parents=True, exist_ok=True)
        settings.workspace_path = str(workspace)
        return settings

    def save(self, settings: AppSettings) -> AppSettings:
        workspace = Path(settings.workspace_path).expanduser()
        workspace.mkdir(parents=True, exist_ok=True)
        settings.workspace_path = str(workspace)
        self._settings_path.write_text(
            settings.model_dump_json(indent=2),
            encoding="utf-8",
        )
        return settings
