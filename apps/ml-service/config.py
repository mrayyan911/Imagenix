"""
Imagenix ML Service Configuration

Defines model IDs, device settings, and anti-hallucination thresholds
for Stable Diffusion + ControlNet based augmentation.
"""

import os
import torch
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration for the ML service."""

    # ── Device Configuration ─────────────────────────────────────────
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    DTYPE: torch.dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    # ── Model IDs ────────────────────────────────────────────────────
    SD_MODEL_ID: str = os.getenv(
        "SD_MODEL_ID", "runwayml/stable-diffusion-v1-5"
    )
    CONTROLNET_CANNY_ID: str = os.getenv(
        "CONTROLNET_CANNY_ID", "lllyasviel/sd-controlnet-canny"
    )
    CONTROLNET_DEPTH_ID: str = os.getenv(
        "CONTROLNET_DEPTH_ID", "lllyasviel/sd-controlnet-depth"
    )
    CONTROLNET_HED_ID: str = os.getenv(
        "CONTROLNET_HED_ID", "lllyasviel/sd-controlnet-hed"
    )

    # ── Anti-Hallucination Thresholds ────────────────────────────────
    # These values are intentionally conservative to ensure generated
    # images preserve the structural layout of the source image.
    #
    # controlnet_scale: How strongly the ControlNet guides generation.
    #   Higher values → closer to original structure. 0.95 is very strict.
    #
    # guidance_scale: Classifier-free guidance scale for the diffusion model.
    #   7.0 balances prompt fidelity and image quality.
    #
    # num_inference_steps: Number of denoising steps. More steps → higher
    #   quality but slower. 30 is a good balance for production.
    #
    # min_structural_similarity: Minimum structural similarity (edge-based)
    #   between source and generated image. Images below this threshold
    #   are flagged as hallucinated and rejected.
    CONTROLNET_SCALE: float = float(os.getenv("CONTROLNET_SCALE", "0.95"))
    GUIDANCE_SCALE: float = float(os.getenv("GUIDANCE_SCALE", "7.0"))
    NUM_INFERENCE_STEPS: int = int(os.getenv("NUM_INFERENCE_STEPS", "30"))
    MIN_STRUCTURAL_SIMILARITY: float = float(
        os.getenv("MIN_STRUCTURAL_SIMILARITY", "0.7")
    )

    # ── Image Defaults ───────────────────────────────────────────────
    MAX_IMAGE_SIZE: int = int(os.getenv("MAX_IMAGE_SIZE", "1024"))
    DEFAULT_OUTPUT_SIZE: int = int(os.getenv("DEFAULT_OUTPUT_SIZE", "512"))

    # ── Server ───────────────────────────────────────────────────────
    HOST: str = os.getenv("ML_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ML_PORT", "8000"))

    # ── Model Cache ──────────────────────────────────────────────────
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "/tmp/models")
    PRELOAD_MODELS: bool = os.getenv("PRELOAD_MODELS", "true").lower() == "true"


settings = Settings()
