"""
ControlNet Preprocessing Helpers

Provides edge-map extractors (Canny, Depth, HED) and a structural
similarity checker used to validate generated images against the
original source, preventing hallucination.

Anti-Hallucination Strategy
───────────────────────────
After an image is generated we extract Canny edges from *both* the
source and the output, then compute the proportion of shared edges.
If the score falls below `MIN_STRUCTURAL_SIMILARITY` the image is
flagged — the caller can retry or reject it.
"""

import logging
from typing import Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("imagenix.controlnet_helpers")


# ── Preprocessors ────────────────────────────────────────────────────


def preprocess_canny(
    image: Image.Image,
    low_threshold: int = 100,
    high_threshold: int = 200,
) -> Image.Image:
    """
    Extract Canny edges from a PIL image.

    Returns a single-channel edge image converted back to RGB for
    pipeline compatibility.
    """
    img_np = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, low_threshold, high_threshold)
    edge_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(edge_rgb)


def preprocess_depth(image: Image.Image) -> Image.Image:
    """
    Estimate a depth map using the controlnet-aux MiDaS detector.

    Falls back to a simple gradient if the detector is unavailable
    (useful for CPU-only dev environments).
    """
    try:
        from controlnet_aux import MidasDetector

        midas = MidasDetector.from_pretrained("lllyasviel/Annotators")
        depth_map = midas(image)
        return depth_map
    except Exception as exc:
        logger.warning("MiDaS depth detector unavailable: %s — using Laplacian fallback.", exc)
        # Laplacian-based pseudo depth (not real depth, but preserves structure)
        img_np = np.array(image.convert("L"))
        blurred = cv2.GaussianBlur(img_np, (5, 5), 0)
        laplacian = cv2.Laplacian(blurred, cv2.CV_64F)
        depth = np.abs(laplacian)
        depth = ((depth / depth.max()) * 255).astype(np.uint8) if depth.max() > 0 else depth.astype(np.uint8)
        depth_rgb = cv2.cvtColor(depth, cv2.COLOR_GRAY2RGB)
        return Image.fromarray(depth_rgb)


def preprocess_hed(image: Image.Image) -> Image.Image:
    """
    Extract HED (Holistically-Nested Edge Detection) soft edges.

    Falls back to a bilateral-filter + Canny approximation when the
    controlnet-aux detector is unavailable.
    """
    try:
        from controlnet_aux import HEDdetector

        hed = HEDdetector.from_pretrained("lllyasviel/Annotators")
        hed_map = hed(image)
        return hed_map
    except Exception as exc:
        logger.warning("HED detector unavailable: %s — using bilateral fallback.", exc)
        img_np = np.array(image.convert("RGB"))
        # Bilateral filter smooths while preserving edges
        filtered = cv2.bilateralFilter(img_np, 9, 75, 75)
        gray = cv2.cvtColor(filtered, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        # Soften edges to mimic HED output
        edges = cv2.GaussianBlur(edges, (3, 3), 0)
        edge_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
        return Image.fromarray(edge_rgb)


# ── Structural Similarity ───────────────────────────────────────────


def compute_structural_similarity(
    source: Image.Image,
    generated: Image.Image,
) -> float:
    """
    Compute a lightweight edge-based structural similarity score.

    Both images are resized to the same dimensions, Canny edges are
    extracted, and the IoU (Intersection-over-Union) of edge pixels
    is computed.

    Returns a float in [0.0, 1.0] where 1.0 = identical structure.
    """
    target_size = (256, 256)

    # Resize to a common resolution
    src = np.array(source.convert("L").resize(target_size))
    gen = np.array(generated.convert("L").resize(target_size))

    # Extract edges
    src_edges = cv2.Canny(src, 100, 200)
    gen_edges = cv2.Canny(gen, 100, 200)

    # Dilate edges slightly to allow for small spatial shifts
    kernel = np.ones((3, 3), np.uint8)
    src_edges = cv2.dilate(src_edges, kernel, iterations=1)
    gen_edges = cv2.dilate(gen_edges, kernel, iterations=1)

    # Compute IoU of edge pixels
    intersection = np.logical_and(src_edges > 0, gen_edges > 0).sum()
    union = np.logical_or(src_edges > 0, gen_edges > 0).sum()

    if union == 0:
        return 1.0  # Both blank → trivially similar

    similarity = float(intersection / union)
    logger.info(
        "Structural similarity: %.4f  (intersection=%d, union=%d)",
        similarity,
        intersection,
        union,
    )
    return similarity


def check_hallucination(
    source: Image.Image,
    generated: Image.Image,
    min_similarity: float,
) -> Tuple[bool, float]:
    """
    Anti-hallucination gate.

    Returns (passed, score).
    `passed` is True when the structural similarity meets the threshold.
    """
    score = compute_structural_similarity(source, generated)
    passed = score >= min_similarity
    if not passed:
        logger.warning(
            "Hallucination detected: similarity %.4f < threshold %.4f",
            score,
            min_similarity,
        )
    return passed, score
