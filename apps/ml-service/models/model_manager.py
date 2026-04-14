"""
Model Manager — Loads and caches Stable Diffusion + ControlNet pipelines.

Supports:
  - Single ControlNet (canny, depth, HED)
  - Dual ControlNet (canny + depth)
  - xformers memory-efficient attention
  - CPU offload for low-VRAM environments
"""

import logging
from typing import Dict, Optional

import torch
from diffusers import (
    ControlNetModel,
    StableDiffusionControlNetPipeline,
    UniPCMultistepScheduler,
)

from config import settings

logger = logging.getLogger("imagenix.model_manager")


class ModelManager:
    """Singleton-style manager that loads models once and reuses them."""

    def __init__(self) -> None:
        self._controlnets: Dict[str, ControlNetModel] = {}
        self._pipelines: Dict[str, StableDiffusionControlNetPipeline] = {}
        self._loaded = False

    # ── Public API ───────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_models(self) -> None:
        """Load all ControlNet models and build pipelines."""
        if self._loaded:
            logger.info("Models already loaded — skipping.")
            return

        logger.info("Loading ControlNet models on device=%s …", settings.DEVICE)

        # Load individual ControlNet models
        self._load_controlnet("canny", settings.CONTROLNET_CANNY_ID)
        self._load_controlnet("depth", settings.CONTROLNET_DEPTH_ID)
        self._load_controlnet("hed", settings.CONTROLNET_HED_ID)

        # Build single-controlnet pipelines
        for name in ("canny", "depth", "hed"):
            self._build_pipeline(name, [self._controlnets[name]])

        # Build dual-controlnet pipeline: canny + depth
        self._build_pipeline(
            "canny_depth",
            [self._controlnets["canny"], self._controlnets["depth"]],
        )

        self._loaded = True
        logger.info("All models loaded successfully.")

    def get_pipeline(
        self, name: str
    ) -> Optional[StableDiffusionControlNetPipeline]:
        """Return a cached pipeline by name (e.g. 'canny', 'canny_depth')."""
        return self._pipelines.get(name)

    def get_controlnet(self, name: str) -> Optional[ControlNetModel]:
        """Return a cached ControlNet model by name."""
        return self._controlnets.get(name)

    # ── Private Helpers ──────────────────────────────────────────────

    def _load_controlnet(self, name: str, model_id: str) -> None:
        """Download / load a single ControlNet checkpoint."""
        logger.info("  Loading ControlNet '%s' from %s", name, model_id)
        cn = ControlNetModel.from_pretrained(
            model_id,
            torch_dtype=settings.DTYPE,
            cache_dir=settings.MODEL_CACHE_DIR,
        )
        self._controlnets[name] = cn

    def _build_pipeline(
        self,
        name: str,
        controlnets: list,
    ) -> None:
        """
        Build a StableDiffusionControlNetPipeline with one or more
        ControlNet models and apply performance optimisations.
        """
        logger.info("  Building pipeline '%s' …", name)

        # If a single controlnet is passed, unwrap from list
        cn_arg = controlnets if len(controlnets) > 1 else controlnets[0]

        pipe = StableDiffusionControlNetPipeline.from_pretrained(
            settings.SD_MODEL_ID,
            controlnet=cn_arg,
            torch_dtype=settings.DTYPE,
            cache_dir=settings.MODEL_CACHE_DIR,
            safety_checker=None,  # We do our own structural validation
        )

        # Use a fast scheduler
        pipe.scheduler = UniPCMultistepScheduler.from_config(
            pipe.scheduler.config
        )

        # ── Performance optimisations ────────────────────────────────
        # 1. Try xformers (best VRAM savings)
        try:
            pipe.enable_xformers_memory_efficient_attention()
            logger.info("    xformers enabled for '%s'", name)
        except Exception:
            logger.warning(
                "    xformers not available for '%s' — falling back to "
                "sliced attention.",
                name,
            )
            pipe.enable_attention_slicing()

        # 2. Move to device, or use CPU offload for low VRAM
        if settings.DEVICE == "cuda":
            try:
                pipe = pipe.to(settings.DEVICE)
            except RuntimeError:
                logger.warning(
                    "    Not enough VRAM — enabling sequential CPU offload "
                    "for '%s'.",
                    name,
                )
                pipe.enable_sequential_cpu_offload()
        else:
            pipe = pipe.to("cpu")

        self._pipelines[name] = pipe


# Module-level singleton
model_manager = ModelManager()
