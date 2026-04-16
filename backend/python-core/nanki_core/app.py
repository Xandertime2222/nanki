import os
import logging
from fastapi import FastAPI
from .routes.health import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nanki-core")

app = FastAPI(title="Nanki Core", version="0.1.0")
app.include_router(health_router)

logger.info("Nanki Core API initialized")