import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.health import router as health_router
from .routes.notes import router as notes_router
from .routes.cards import router as cards_router
from .routes.import_routes import router as import_router
from .routes.settings import router as settings_router
from .routes.anki import router as anki_router
from .routes.ai import router as ai_router
from .routes.coverage import router as coverage_router
from .routes.render import router as render_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nanki-core")

app = FastAPI(title="Nanki Core", version="0.1.0")

# Enable CORS for Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(notes_router)
app.include_router(cards_router)
app.include_router(import_router)
app.include_router(settings_router)
app.include_router(anki_router)
app.include_router(ai_router)
app.include_router(coverage_router)
app.include_router(render_router)

logger.info("Nanki Core API initialized with all endpoints")
