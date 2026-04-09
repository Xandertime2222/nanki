from __future__ import annotations

import webbrowser
from threading import Timer

import uvicorn

from .app import app, settings_manager


def main() -> None:
    settings = settings_manager.load()
    url = f"http://{settings.host}:{settings.port}"
    if settings.open_browser_on_launch:
        Timer(1.0, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    main()
