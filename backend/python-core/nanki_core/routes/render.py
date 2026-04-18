import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..models import RenderMarkdownRequest, HtmlToMarkdownRequest
from ..storage import WorkspaceStore
from ..config import SettingsManager

try:
    import mistune
except ImportError:
    mistune = None

try:
    import markdownify
except ImportError:
    markdownify = None

router = APIRouter(prefix="/api", tags=["render"])

settings_manager = SettingsManager()
store = WorkspaceStore(settings_manager)


@router.post("/render-markdown")
async def render_markdown(payload: RenderMarkdownRequest) -> dict:
    """Render markdown text to HTML using mistune."""
    if mistune is None:
        raise HTTPException(status_code=500, detail="mistune is not installed")

    md = mistune.create_markdown()
    html = md(payload.markdown)
    return {"html": html}


@router.post("/convert-html")
async def convert_html_to_markdown(payload: HtmlToMarkdownRequest) -> dict:
    """Convert HTML text to markdown using markdownify."""
    if markdownify is None:
        raise HTTPException(status_code=500, detail="markdownify is not installed")

    md = markdownify.markdownify(payload.html)
    return {"markdown": md}


@router.get("/download")
async def download_file(path: str) -> FileResponse:
    """Download a file from an export path."""
    file_path = Path(path).resolve()

    # Security: ensure the resolved path is within the workspace exports directory
    settings = settings_manager.load()
    workspace = Path(settings.workspace_path).resolve()
    exports = workspace / "exports"

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    if not str(file_path).startswith(str(exports)):
        raise HTTPException(status_code=403, detail="Access denied: path outside exports directory")

    return FileResponse(
        str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )
