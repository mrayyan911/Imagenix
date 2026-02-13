"""
ML Service API Routes

Endpoints:
  POST /api/v1/generate/controlnet-canny      — Single ControlNet (Canny)
  POST /api/v1/generate/dual-control           — Dual ControlNet (Canny + Depth)
  POST /api/v1/generate/safe-augmentation      — Preset-prompt safe generation
  POST /api/v1/validate/hallucination-check    — Compare source & generated

All generation endpoints accept a multipart form with an image file
and JSON parameters.  Images are validated, preprocessed, and passed
through the Stable Diffusion + ControlNet pipeline with strict
anti-hallucination defaults.
"""

import io
import logging
from typing import Optional

import torch
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image

from config import settings
from models.model_manager import model_manager
from utils.controlnet_helpers import (
    check_hallucination,
    preprocess_canny,
    preprocess_depth,
    preprocess_hed,
)
from utils.image_processing import (
    ensure_rgb,
    pil_to_bytes,
    resize_for_pipeline,
    validate_image,
)

from .validators import (
    ControlNetType,
    DualControlRequest,
    GenerateControlNetRequest,
    GenerationResult,
    HallucinationCheckRequest,
    HallucinationResult,
    SafeAugmentationRequest,
    SAFE_PROMPT_TEMPLATES,
)

logger = logging.getLogger("imagenix.routes")

router = APIRouter(prefix="/api/v1")


# ═════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════

async def _read_upload(file: UploadFile) -> Image.Image:
    """Read an UploadFile, validate, and return a PIL Image."""
    data = await file.read()
    try:
        image = validate_image(data, file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ensure_rgb(image)


def _get_generator(seed: Optional[int]) -> torch.Generator:
    """Create a torch Generator with an optional fixed seed."""
    gen = torch.Generator(device=settings.DEVICE)
    if seed is not None:
        gen.manual_seed(seed)
    else:
        gen.seed()
    return gen


def _image_response(image: Image.Image) -> StreamingResponse:
    """Return a PIL image as a PNG streaming response."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


PREPROCESSORS = {
    ControlNetType.CANNY: preprocess_canny,
    ControlNetType.DEPTH: preprocess_depth,
    ControlNetType.HED: preprocess_hed,
}


# ═════════════════════════════════════════════════════════════════════
# POST /api/v1/generate/controlnet-canny
# ═════════════════════════════════════════════════════════════════════

@router.post(
    "/generate/controlnet-canny",
    response_model=GenerationResult,
    summary="Generate with single Canny ControlNet",
)
async def generate_controlnet_canny(
    image: UploadFile = File(..., description="Source image"),
    prompt: str = Form(...),
    negative_prompt: str = Form("blurry, distorted, deformed, low quality, bad anatomy"),
    controlnet_scale: Optional[float] = Form(None),
    guidance_scale: Optional[float] = Form(None),
    num_inference_steps: Optional[int] = Form(None),
    seed: Optional[int] = Form(None),
    output_size: Optional[int] = Form(None),
):
    """
    Generate a variation using Canny edge ControlNet.

    The source image's edge structure is extracted and used to guide
    Stable Diffusion, ensuring the generated image preserves layout.
    """
    pipe = model_manager.get_pipeline("canny")
    if pipe is None:
        raise HTTPException(status_code=503, detail="Canny pipeline not loaded.")

    source = await _read_upload(image)
    source = resize_for_pipeline(source, output_size)

    # Extract Canny edges as control image
    control_image = preprocess_canny(source)

    cn_scale = controlnet_scale or settings.CONTROLNET_SCALE
    g_scale = guidance_scale or settings.GUIDANCE_SCALE
    steps = num_inference_steps or settings.NUM_INFERENCE_STEPS
    generator = _get_generator(seed)
    actual_seed = generator.initial_seed()

    logger.info(
        "Canny generation: prompt=%r  cn_scale=%.2f  g_scale=%.1f  steps=%d  seed=%d",
        prompt, cn_scale, g_scale, steps, actual_seed,
    )

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=control_image,
        num_inference_steps=steps,
        guidance_scale=g_scale,
        controlnet_conditioning_scale=cn_scale,
        generator=generator,
    )
    generated = result.images[0]

    # Anti-hallucination: structural similarity check
    passed, similarity = check_hallucination(
        source, generated, settings.MIN_STRUCTURAL_SIMILARITY
    )

    return GenerationResult(
        success=True,
        seed=actual_seed,
        prompt=prompt,
        controlnet_type="canny",
        controlnet_scale=cn_scale,
        guidance_scale=g_scale,
        steps=steps,
        structural_similarity=round(similarity, 4),
        hallucination_passed=passed,
        message="Generation complete" if passed else (
            f"Warning: structural similarity {similarity:.4f} below "
            f"threshold {settings.MIN_STRUCTURAL_SIMILARITY}"
        ),
    )


@router.post(
    "/generate/controlnet-canny/image",
    summary="Generate with Canny ControlNet — returns image directly",
)
async def generate_controlnet_canny_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form("blurry, distorted, deformed, low quality, bad anatomy"),
    controlnet_scale: Optional[float] = Form(None),
    guidance_scale: Optional[float] = Form(None),
    num_inference_steps: Optional[int] = Form(None),
    seed: Optional[int] = Form(None),
    output_size: Optional[int] = Form(None),
):
    """Same as controlnet-canny but streams back the PNG directly."""
    pipe = model_manager.get_pipeline("canny")
    if pipe is None:
        raise HTTPException(status_code=503, detail="Canny pipeline not loaded.")

    source = await _read_upload(image)
    source = resize_for_pipeline(source, output_size)
    control_image = preprocess_canny(source)

    cn_scale = controlnet_scale or settings.CONTROLNET_SCALE
    g_scale = guidance_scale or settings.GUIDANCE_SCALE
    steps = num_inference_steps or settings.NUM_INFERENCE_STEPS
    generator = _get_generator(seed)

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=control_image,
        num_inference_steps=steps,
        guidance_scale=g_scale,
        controlnet_conditioning_scale=cn_scale,
        generator=generator,
    )

    return _image_response(result.images[0])


# ═════════════════════════════════════════════════════════════════════
# POST /api/v1/generate/dual-control
# ═════════════════════════════════════════════════════════════════════

@router.post(
    "/generate/dual-control",
    response_model=GenerationResult,
    summary="Generate with dual ControlNet (Canny + Depth)",
)
async def generate_dual_control(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form("blurry, distorted, deformed, low quality, bad anatomy"),
    canny_scale: Optional[float] = Form(0.7),
    depth_scale: Optional[float] = Form(0.7),
    guidance_scale: Optional[float] = Form(None),
    num_inference_steps: Optional[int] = Form(None),
    seed: Optional[int] = Form(None),
    output_size: Optional[int] = Form(None),
):
    """
    Generate with BOTH Canny + Depth ControlNets.

    Dual conditioning provides even stronger structural preservation:
    Canny captures fine edges while Depth preserves spatial layout.
    This is the strongest anti-hallucination generation mode.
    """
    pipe = model_manager.get_pipeline("canny_depth")
    if pipe is None:
        raise HTTPException(status_code=503, detail="Dual ControlNet pipeline not loaded.")

    source = await _read_upload(image)
    source = resize_for_pipeline(source, output_size)

    canny_image = preprocess_canny(source)
    depth_image = preprocess_depth(source)

    g_scale = guidance_scale or settings.GUIDANCE_SCALE
    steps = num_inference_steps or settings.NUM_INFERENCE_STEPS
    generator = _get_generator(seed)
    actual_seed = generator.initial_seed()

    logger.info(
        "Dual-control generation: prompt=%r  canny_scale=%.2f  depth_scale=%.2f  "
        "g_scale=%.1f  steps=%d  seed=%d",
        prompt, canny_scale, depth_scale, g_scale, steps, actual_seed,
    )

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=[canny_image, depth_image],
        num_inference_steps=steps,
        guidance_scale=g_scale,
        controlnet_conditioning_scale=[canny_scale, depth_scale],
        generator=generator,
    )
    generated = result.images[0]

    passed, similarity = check_hallucination(
        source, generated, settings.MIN_STRUCTURAL_SIMILARITY
    )

    return GenerationResult(
        success=True,
        seed=actual_seed,
        prompt=prompt,
        controlnet_type="canny+depth",
        controlnet_scale=canny_scale,  # primary scale
        guidance_scale=g_scale,
        steps=steps,
        structural_similarity=round(similarity, 4),
        hallucination_passed=passed,
        message="Dual-control generation complete" if passed else (
            f"Warning: structural similarity {similarity:.4f} below "
            f"threshold {settings.MIN_STRUCTURAL_SIMILARITY}"
        ),
    )


@router.post(
    "/generate/dual-control/image",
    summary="Dual ControlNet — returns image directly",
)
async def generate_dual_control_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form("blurry, distorted, deformed, low quality, bad anatomy"),
    canny_scale: Optional[float] = Form(0.7),
    depth_scale: Optional[float] = Form(0.7),
    guidance_scale: Optional[float] = Form(None),
    num_inference_steps: Optional[int] = Form(None),
    seed: Optional[int] = Form(None),
    output_size: Optional[int] = Form(None),
):
    pipe = model_manager.get_pipeline("canny_depth")
    if pipe is None:
        raise HTTPException(status_code=503, detail="Dual ControlNet pipeline not loaded.")

    source = await _read_upload(image)
    source = resize_for_pipeline(source, output_size)

    canny_image = preprocess_canny(source)
    depth_image = preprocess_depth(source)

    g_scale = guidance_scale or settings.GUIDANCE_SCALE
    steps = num_inference_steps or settings.NUM_INFERENCE_STEPS
    generator = _get_generator(seed)

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=[canny_image, depth_image],
        num_inference_steps=steps,
        guidance_scale=g_scale,
        controlnet_conditioning_scale=[canny_scale, depth_scale],
        generator=generator,
    )
    return _image_response(result.images[0])


# ═════════════════════════════════════════════════════════════════════
# POST /api/v1/generate/safe-augmentation
# ═════════════════════════════════════════════════════════════════════

@router.post(
    "/generate/safe-augmentation",
    response_model=GenerationResult,
    summary="Safe augmentation with preset prompt templates",
)
async def generate_safe_augmentation(
    image: UploadFile = File(...),
    variation_type: str = Form(...),
    controlnet_type: str = Form("canny"),
    controlnet_scale: Optional[float] = Form(None),
    seed: Optional[int] = Form(None),
    output_size: Optional[int] = Form(None),
):
    """
    Generate a safe, structure-preserving variation.

    Anti-hallucination safeguards:
    1. Prompt is selected from a curated template library — no free-form
       user input is accepted.
    2. ControlNet conditioning is set to a high default (0.95) to enforce
       structural fidelity.
    3. The result is automatically checked for structural similarity.
    """
    # Validate variation type
    try:
        from .validators import SafeVariationType
        var_type = SafeVariationType(variation_type)
    except ValueError:
        valid = [v.value for v in SafeVariationType]  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid variation_type: '{variation_type}'. "
                   f"Valid types: {valid}",
        )

    # Validate controlnet type
    try:
        cn_type = ControlNetType(controlnet_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid controlnet_type: '{controlnet_type}'. "
                   f"Valid: canny, depth, hed",
        )

    pipe = model_manager.get_pipeline(cn_type.value)
    if pipe is None:
        raise HTTPException(
            status_code=503,
            detail=f"Pipeline '{cn_type.value}' not loaded.",
        )

    source = await _read_upload(image)
    source = resize_for_pipeline(source, output_size)

    # Get preprocessor and apply
    preprocessor = PREPROCESSORS[cn_type]
    control_image = preprocessor(source)

    # Use curated prompt template (anti-hallucination)
    prompt = SAFE_PROMPT_TEMPLATES[var_type]
    cn_scale = controlnet_scale or settings.CONTROLNET_SCALE
    g_scale = settings.GUIDANCE_SCALE
    steps = settings.NUM_INFERENCE_STEPS
    generator = _get_generator(seed)
    actual_seed = generator.initial_seed()

    logger.info(
        "Safe augmentation: type=%s  cn=%s  cn_scale=%.2f  seed=%d",
        var_type.value, cn_type.value, cn_scale, actual_seed,
    )

    result = pipe(
        prompt=prompt,
        negative_prompt="blurry, distorted, deformed, low quality, bad anatomy, unrealistic",
        image=control_image,
        num_inference_steps=steps,
        guidance_scale=g_scale,
        controlnet_conditioning_scale=cn_scale,
        generator=generator,
    )
    generated = result.images[0]

    passed, similarity = check_hallucination(
        source, generated, settings.MIN_STRUCTURAL_SIMILARITY
    )

    return GenerationResult(
        success=True,
        seed=actual_seed,
        prompt=prompt,
        controlnet_type=cn_type.value,
        controlnet_scale=cn_scale,
        guidance_scale=g_scale,
        steps=steps,
        structural_similarity=round(similarity, 4),
        hallucination_passed=passed,
        message=f"Safe augmentation ({var_type.value}) complete" if passed else (
            f"Warning: similarity {similarity:.4f} < {settings.MIN_STRUCTURAL_SIMILARITY}"
        ),
    )


@router.post(
    "/generate/safe-augmentation/image",
    summary="Safe augmentation — returns image directly",
)
async def generate_safe_augmentation_image(
    image: UploadFile = File(...),
    variation_type: str = Form(...),
    controlnet_type: str = Form("canny"),
    controlnet_scale: Optional[float] = Form(None),
    seed: Optional[int] = Form(None),
    output_size: Optional[int] = Form(None),
):
    from .validators import SafeVariationType

    try:
        var_type = SafeVariationType(variation_type)
    except ValueError:
        valid = [v.value for v in SafeVariationType]  # type: ignore[attr-defined]
        raise HTTPException(status_code=400, detail=f"Invalid variation_type. Valid: {valid}")

    try:
        cn_type = ControlNetType(controlnet_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid controlnet_type.")

    pipe = model_manager.get_pipeline(cn_type.value)
    if pipe is None:
        raise HTTPException(status_code=503, detail=f"Pipeline '{cn_type.value}' not loaded.")

    source = await _read_upload(image)
    source = resize_for_pipeline(source, output_size)
    preprocessor = PREPROCESSORS[cn_type]
    control_image = preprocessor(source)

    prompt = SAFE_PROMPT_TEMPLATES[var_type]
    cn_scale = controlnet_scale or settings.CONTROLNET_SCALE
    generator = _get_generator(seed)

    result = pipe(
        prompt=prompt,
        negative_prompt="blurry, distorted, deformed, low quality, bad anatomy, unrealistic",
        image=control_image,
        num_inference_steps=settings.NUM_INFERENCE_STEPS,
        guidance_scale=settings.GUIDANCE_SCALE,
        controlnet_conditioning_scale=cn_scale,
        generator=generator,
    )
    return _image_response(result.images[0])


# ═════════════════════════════════════════════════════════════════════
# POST /api/v1/validate/hallucination-check
# ═════════════════════════════════════════════════════════════════════

@router.post(
    "/validate/hallucination-check",
    response_model=HallucinationResult,
    summary="Check structural similarity between source and generated image",
)
async def hallucination_check(
    source_image: UploadFile = File(..., description="Original source image"),
    generated_image: UploadFile = File(..., description="Generated image to validate"),
    min_similarity: Optional[float] = Form(None),
):
    """
    Anti-hallucination validation endpoint.

    Compares the structural layout (edge maps) of a source and generated
    image.  Returns a pass/fail verdict with a similarity score.

    Use this after every generation to ensure the output preserves the
    original scene structure.
    """
    source = await _read_upload(source_image)
    generated = await _read_upload(generated_image)

    threshold = min_similarity or settings.MIN_STRUCTURAL_SIMILARITY

    passed, score = check_hallucination(source, generated, threshold)

    return HallucinationResult(
        passed=passed,
        similarity_score=round(score, 4),
        threshold=threshold,
        message=(
            f"Structural similarity {score:.4f} meets threshold {threshold}"
            if passed
            else f"HALLUCINATION DETECTED: similarity {score:.4f} < threshold {threshold}. "
                 f"The generated image deviates too far from the source structure."
        ),
    )
