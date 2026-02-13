"""
Image Processing Utilities

Handles validation, resizing, and format conversion for images
flowing through the ML service pipeline.
"""

import io
import logging
from typing import Optional, Tuple

from PIL import Image

from config import settings

logger = logging.getLogger("imagenix.image_processing")

# Accepted MIME types
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}

# Maximum file size: 20 MB
MAX_FILE_SIZE = 20 * 1024 * 1024


def validate_image(data: bytes, content_type: Optional[str] = None) -> Image.Image:
    """
    Validate and open an image from raw bytes.

    Raises ValueError if the data is too large, the format is not
    supported, or the image is corrupted.
    """
    if len(data) > MAX_FILE_SIZE:
        raise ValueError(
            f"Image exceeds maximum size: {len(data)} bytes "
            f"(limit {MAX_FILE_SIZE} bytes)."
        )

    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise ValueError(
            f"Unsupported content type: {content_type}. "
            f"Accepted: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )

    try:
        image = Image.open(io.BytesIO(data))
        image.verify()
        # Re-open after verify (verify() leaves file pointer consumed)
        image = Image.open(io.BytesIO(data))
    except Exception as exc:
        raise ValueError(f"Invalid or corrupted image: {exc}") from exc

    return image


def resize_for_pipeline(
    image: Image.Image,
    target_size: Optional[int] = None,
) -> Image.Image:
    """
    Resize image so that both dimensions are multiples of 8 (required
    by Stable Diffusion) and neither dimension exceeds `target_size`.

    Preserves aspect ratio by fitting within a bounding box.
    """
    target = target_size or settings.DEFAULT_OUTPUT_SIZE
    max_dim = settings.MAX_IMAGE_SIZE

    w, h = image.size

    # Clamp to absolute maximum
    if w > max_dim or h > max_dim:
        scale = max_dim / max(w, h)
        w, h = int(w * scale), int(h * scale)

    # Fit within target
    if w > target or h > target:
        scale = target / max(w, h)
        w, h = int(w * scale), int(h * scale)

    # Round to nearest multiple of 8
    w = max(8, (w // 8) * 8)
    h = max(8, (h // 8) * 8)

    resized = image.resize((w, h), Image.LANCZOS)
    logger.debug("Resized image from %s to %s", image.size, (w, h))
    return resized


def pil_to_bytes(image: Image.Image, fmt: str = "PNG") -> bytes:
    """Convert a PIL image to bytes in the specified format."""
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return buf.getvalue()


def bytes_to_pil(data: bytes) -> Image.Image:
    """Convert raw bytes to a PIL image."""
    return Image.open(io.BytesIO(data))


def ensure_rgb(image: Image.Image) -> Image.Image:
    """Convert image to RGB, handling RGBA, palette, and grayscale modes."""
    if image.mode == "RGB":
        return image
    if image.mode == "RGBA":
        # Composite on white background
        bg = Image.new("RGB", image.size, (255, 255, 255))
        bg.paste(image, mask=image.split()[3])
        return bg
    return image.convert("RGB")


def get_image_dimensions(image: Image.Image) -> Tuple[int, int]:
    """Return (width, height) of a PIL image."""
    return image.size
