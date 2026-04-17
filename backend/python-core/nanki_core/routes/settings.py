from fastapi import APIRouter, HTTPException
from ..models import AppSettings, AppState, WorkspaceUpdateRequest, AIPromptSettings, APCGSettings
from ..storage import WorkspaceStore
from ..config import SettingsManager
from ..updater import is_update_available
from .utils import utc_now_iso

router = APIRouter(tags=["settings"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)


@router.get("/api/settings")
async def get_settings() -> AppSettings:
    """Get app settings."""
    return settings_manager.load()


@router.put("/api/settings")
async def update_settings(payload: AppSettings) -> AppSettings:
    """Update app settings."""
    return settings_manager.save(payload)


@router.get("/api/state")
async def get_state() -> AppState:
    """Get app state (onboarding, update checks, etc.)."""
    return AppState.model_validate(settings_manager.load_state())


@router.put("/api/state")
async def update_state(payload: AppState) -> AppState:
    """Update app state."""
    return AppState.model_validate(settings_manager.save_state(payload.model_dump()))


@router.get("/api/updates/check")
async def check_for_updates() -> dict:
    """Check GitHub for latest release."""
    import httpx
    
    current_version = "0.5.0"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.github.com/repos/Xandertime2222/nanki/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
            )
            if response.status_code == 200:
                release = response.json()
                latest_version = release.get("tag_name", "v0.0.0").lstrip("v")
                
                def parse_version(v: str) -> tuple:
                    parts = v.split(".")
                    return tuple(int(p) for p in parts[:3] if p.isdigit())
                
                current_tuple = parse_version(current_version)
                latest_tuple = parse_version(latest_version)
                has_update = latest_tuple > current_tuple
                
                return {
                    "current_version": current_version,
                    "latest_version": latest_version,
                    "has_update": has_update,
                    "release_url": release.get("html_url", ""),
                    "release_notes": release.get("body", ""),
                    "checked_at": utc_now_iso(),
                }
    except Exception:
        pass
    
    return {
        "current_version": current_version,
        "latest_version": current_version,
        "has_update": False,
        "release_url": "",
        "release_notes": "",
        "checked_at": utc_now_iso(),
    }


@router.post("/api/settings/workspace")
async def update_workspace(payload: WorkspaceUpdateRequest) -> AppSettings:
    """Update workspace path."""
    settings = settings_manager.load()
    settings.workspace_path = payload.workspace_path
    return settings_manager.save(settings)


@router.post("/api/settings/prompts/reset")
async def reset_prompts() -> dict:
    """Reset AI prompts to default values."""
    from .. import prompts
    from ..models import AIPromptSettings
    
    try:
        settings = settings_manager.load()
        settings.ai.prompts = AIPromptSettings()
        settings_manager.save(settings)
        
        return {
            "status": "success",
            "message": "Prompts reset to default",
            "prompts": {
                "flashcard": prompts.DEFAULT_FLASHCARD_SYSTEM_PROMPT,
                "auto_flashcard": prompts.DEFAULT_AUTO_FLASHCARD_SYSTEM_PROMPT,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reset prompts: {str(exc)}") from exc


@router.post("/api/settings/apcg/reset")
async def reset_apcg_settings() -> dict:
    """Reset APCG settings to default values."""
    from ..models import APCGSettings
    
    try:
        settings = settings_manager.load()
        settings.apcg = APCGSettings()
        settings_manager.save(settings)
        
        return {
            "status": "success",
            "message": "APCG settings reset to default",
            "apcg": {
                "default_mode": settings.apcg.default_mode,
                "include_anki_cards": settings.apcg.include_anki_cards,
                "auto_refresh": settings.apcg.auto_refresh,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reset APCG settings: {str(exc)}") from exc
