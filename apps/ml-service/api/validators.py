"""
Request / Response Validators (Pydantic v2 models)

Defines strict schemas for every API endpoint to ensure safe input
and well-structured output.
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────


class ControlNetType(str, Enum):
    CANNY = "canny"
    DEPTH = "depth"
    HED = "hed"


class SafeVariationType(str, Enum):
    """
    Pre-approved variation types with vetted prompt templates.
    Using these ensures the model stays close to the source image.
    """
    RAIN = "rain"
    SNOW = "snow"
    NIGHT = "night"
    GOLDEN_HOUR = "golden_hour"
    OVERCAST = "overcast"
    FOGGY = "foggy"
    NATURE = "nature"


# ── Prompt Templates (anti-hallucination: curated & safe) ────────────

SAFE_PROMPT_TEMPLATES = {
    SafeVariationType.RAIN: (
        "same scene with heavy rain, wet surfaces, rain drops, "
        "overcast sky, realistic weather, highly detailed"
    ),
    SafeVariationType.SNOW: (
        "same scene with snow covering the ground, snowflakes falling, "
        "winter atmosphere, cold lighting, highly detailed"
    ),
    SafeVariationType.NIGHT: (
        "same scene at night time, dark sky, street lights, "
        "moonlight, realistic nighttime lighting, highly detailed"
    ),
    SafeVariationType.GOLDEN_HOUR: (
        "same scene during golden hour, warm orange sunlight, "
        "long shadows, beautiful sunset lighting, highly detailed"
    ),
    SafeVariationType.OVERCAST: (
        "same scene on an overcast day, grey clouds, diffused lighting, "
        "flat even illumination, realistic, highly detailed"
    ),
    SafeVariationType.FOGGY: (
        "same scene with dense fog, low visibility, atmospheric haze, "
        "muted colors, realistic foggy weather, highly detailed"
    ),
    SafeVariationType.NATURE: (
        "same scene surrounded by lush green nature, trees and vegetation, "
        "natural environment, realistic, highly detailed"
    ),
}


# ── Request Models ───────────────────────────────────────────────────


class GenerateControlNetRequest(BaseModel):
    """Parameters for single-ControlNet generation."""
    prompt: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Text prompt to guide generation",
    )
    negative_prompt: Optional[str] = Field(
        default="blurry, distorted, deformed, low quality, bad anatomy",
        max_length=500,
        description="Negative prompt to avoid unwanted features",
    )
    controlnet_scale: Optional[float] = Field(
        default=None,
        ge=0.1,
        le=2.0,
        description="ControlNet conditioning scale (default from config)",
    )
    guidance_scale: Optional[float] = Field(
        default=None,
        ge=1.0,
        le=20.0,
        description="Classifier-free guidance scale",
    )
    num_inference_steps: Optional[int] = Field(
        default=None,
        ge=10,
        le=100,
        description="Number of denoising steps",
    )
    seed: Optional[int] = Field(
        default=None,
        description="Random seed for reproducibility",
    )
    output_size: Optional[int] = Field(
        default=None,
        ge=256,
        le=1024,
        description="Target output size (both width/height clamped to this)",
    )


class DualControlRequest(BaseModel):
    """Parameters for dual ControlNet (Canny + Depth) generation."""
    prompt: str = Field(..., min_length=3, max_length=500)
    negative_prompt: Optional[str] = Field(
        default="blurry, distorted, deformed, low quality, bad anatomy",
        max_length=500,
    )
    canny_scale: Optional[float] = Field(default=0.7, ge=0.1, le=2.0)
    depth_scale: Optional[float] = Field(default=0.7, ge=0.1, le=2.0)
    guidance_scale: Optional[float] = Field(default=None, ge=1.0, le=20.0)
    num_inference_steps: Optional[int] = Field(default=None, ge=10, le=100)
    seed: Optional[int] = Field(default=None)
    output_size: Optional[int] = Field(default=None, ge=256, le=1024)


class SafeAugmentationRequest(BaseModel):
    """
    Safe augmentation with preset prompt templates.

    Anti-hallucination safeguard: the prompt is selected from a curated
    list — no free-form user prompt is accepted.
    """
    variation_type: SafeVariationType = Field(
        ...,
        description="Pre-approved variation type",
    )
    controlnet_type: ControlNetType = Field(
        default=ControlNetType.CANNY,
        description="Which ControlNet to use for structural guidance",
    )
    controlnet_scale: Optional[float] = Field(default=None, ge=0.1, le=2.0)
    seed: Optional[int] = Field(default=None)
    output_size: Optional[int] = Field(default=None, ge=256, le=1024)


class HallucinationCheckRequest(BaseModel):
    """Request body for the hallucination validation endpoint."""
    min_similarity: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Override the default similarity threshold",
    )


# ── Response Models ──────────────────────────────────────────────────


class GenerationResult(BaseModel):
    """Standard generation response."""
    success: bool
    seed: int
    prompt: str
    controlnet_type: str
    controlnet_scale: float
    guidance_scale: float
    steps: int
    structural_similarity: Optional[float] = None
    hallucination_passed: Optional[bool] = None
    message: Optional[str] = None


class HallucinationResult(BaseModel):
    """Response from hallucination check."""
    passed: bool
    similarity_score: float
    threshold: float
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    device: str
    models_loaded: bool
    available_pipelines: List[str]
