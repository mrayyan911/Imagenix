"""
Imagenix ML Service — Stable Diffusion + ControlNet Augmentation

A FastAPI microservice that provides structure-preserving image generation
using ControlNet-guided Stable Diffusion with anti-hallucination safeguards.

Startup behaviour:
  1. Configure logging
  2. Optionally pre-load all models (PRELOAD_MODELS=true)
  3. Expose /health and all generation endpoints
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from api.validators import HealthResponse
from config import settings
from models.model_manager import model_manager

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("imagenix.ml")


# ── Application Lifespan ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: optionally pre-load Stable Diffusion + ControlNet models.
    On shutdown: (no special cleanup needed — Python GC handles it.)
    """
    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Imagenix ML Service starting …")
    logger.info("  Device : %s", settings.DEVICE)
    logger.info("  Dtype  : %s", settings.DTYPE)
    logger.info("═══════════════════════════════════════════════════════")

    if settings.PRELOAD_MODELS:
        logger.info("Pre-loading models (PRELOAD_MODELS=true) …")
        try:
            model_manager.load_models()
            logger.info("Models loaded successfully.")
        except Exception as exc:
            logger.error("Failed to pre-load models: %s", exc, exc_info=True)
            logger.warning(
                "Service will start without models. "
                "Generation endpoints will return 503 until models are loaded."
            )
    else:
        logger.info(
            "Skipping model pre-load (PRELOAD_MODELS=false). "
            "Models will load on first request."
        )

    yield  # Application is running

    logger.info("Imagenix ML Service shutting down.")


# ── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title="Imagenix ML Service",
    description=(
        "Stable Diffusion + ControlNet augmentation service with "
        "anti-hallucination safeguards for structure-preserving "
        "image generation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the NestJS backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(router)


# ── Health Check ─────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """
    Health endpoint.

    Returns service status, device info, and which pipelines are loaded.
    Used by the NestJS backend to verify the ML service is reachable.
    """
    available = []
    for name in ("canny", "depth", "hed", "canny_depth"):
        if model_manager.get_pipeline(name) is not None:
            available.append(name)

    return HealthResponse(
        status="healthy",
        device=settings.DEVICE,
        models_loaded=model_manager.is_loaded,
        available_pipelines=available,
    )


# ── Manual Load Endpoint (for lazy-loading setups) ───────────────────

@app.post("/models/load", tags=["Models"])
async def load_models():
    """Trigger model loading on demand (if not pre-loaded on startup)."""
    if model_manager.is_loaded:
        return {"message": "Models already loaded."}
    try:
        model_manager.load_models()
        return {"message": "Models loaded successfully."}
    except Exception as exc:
        return {"message": f"Failed to load models: {exc}"}


# ── Entry Point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
