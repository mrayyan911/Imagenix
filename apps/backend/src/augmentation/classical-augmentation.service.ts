import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as crypto from 'crypto';

export interface AugmentationResult {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
  transformsApplied: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformedAnnotation {
  originalId: string;
  labelClassId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isValid: boolean; // False if box goes out of bounds
}

@Injectable()
export class ClassicalAugmentationService {
  /**
   * Apply classical augmentations to an image
   */
  async augmentImage(
    imageBuffer: Buffer,
    transforms: { type: string; value?: number }[],
    originalWidth: number,
    originalHeight: number
  ): Promise<AugmentationResult> {
    const transformsApplied: string[] = [];

    // Track current dimensions as transforms are applied
    let currentWidth = originalWidth;
    let currentHeight = originalHeight;
    let currentBuffer = imageBuffer;

    for (const transform of transforms) {
      let pipeline = sharp(currentBuffer);

      switch (transform.type) {
        case 'flip_horizontal':
          pipeline = pipeline.flop();
          transformsApplied.push('flip_horizontal');
          break;

        case 'flip_vertical':
          pipeline = pipeline.flip();
          transformsApplied.push('flip_vertical');
          break;

        case 'rotate': {
          const degrees = transform.value || 90;
          if (Math.abs(degrees % 360) > 0.5) {
            const rad = Math.abs((degrees * Math.PI) / 180);
            const sinA = Math.sin(rad);
            const padX = Math.ceil((currentHeight * sinA) / 2);
            const padY = Math.ceil((currentWidth * sinA) / 2);

            const paddedBuf = await pipeline
              .extend({
                top: padY,
                bottom: padY,
                left: padX,
                right: padX,
                extendWith: 'mirror',
              })
              .toBuffer();

            const rotBuf = await sharp(paddedBuf)
              .rotate(degrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .toBuffer();
            const rotMeta = await sharp(rotBuf).metadata();
            const rotW = rotMeta.width!;
            const rotH = rotMeta.height!;

            const cL = Math.max(0, Math.floor((rotW - currentWidth) / 2));
            const cT = Math.max(0, Math.floor((rotH - currentHeight) / 2));
            const cW = Math.min(currentWidth, rotW - cL);
            const cH = Math.min(currentHeight, rotH - cT);

            pipeline = sharp(rotBuf).extract({ left: cL, top: cT, width: cW, height: cH });
            if (cW !== currentWidth || cH !== currentHeight) {
              pipeline = pipeline.resize(currentWidth, currentHeight);
            }

            currentBuffer = await pipeline.toBuffer();
            const rotFinalMeta = await sharp(currentBuffer).metadata();
            if (rotFinalMeta.width && rotFinalMeta.height) {
              currentWidth = rotFinalMeta.width;
              currentHeight = rotFinalMeta.height;
            }
            transformsApplied.push(`rotate_${degrees}`);
            continue;
          }
          transformsApplied.push(`rotate_${degrees}`);
          break;
        }

        case 'brightness': {
          const brightnessFactor = transform.value || 1.2;
          pipeline = pipeline.modulate({ brightness: brightnessFactor });
          transformsApplied.push(`brightness_${brightnessFactor}`);
          break;
        }

        case 'contrast': {
          const contrastFactor = transform.value || 1.2;
          pipeline = pipeline.linear(contrastFactor, -(128 * contrastFactor) + 128);
          transformsApplied.push(`contrast_${contrastFactor}`);
          break;
        }

        case 'saturation': {
          const saturationFactor = transform.value || 1.3;
          pipeline = pipeline.modulate({ saturation: saturationFactor });
          transformsApplied.push(`saturation_${saturationFactor}`);
          break;
        }

        case 'blur': {
          const blurSigma = transform.value || 2;
          pipeline = pipeline.blur(blurSigma);
          transformsApplied.push(`blur_${blurSigma}`);
          break;
        }

        case 'noise':
          pipeline = pipeline.sharpen({ sigma: transform.value || 1 });
          transformsApplied.push(`noise_${transform.value || 1}`);
          break;

        case 'scale': {
          const scaleFactor = transform.value || 0.8;
          const newScaleWidth = Math.max(1, Math.round(currentWidth * scaleFactor));
          const newScaleHeight = Math.max(1, Math.round(currentHeight * scaleFactor));
          pipeline = pipeline.resize(newScaleWidth, newScaleHeight);
          currentWidth = newScaleWidth;
          currentHeight = newScaleHeight;
          transformsApplied.push(`scale_${scaleFactor}`);
          break;
        }

        case 'crop': {
          const cropPercent = Math.min(0.95, Math.max(0.5, transform.value || 0.8));
          const cropWidth = Math.max(1, Math.round(currentWidth * cropPercent));
          const cropHeight = Math.max(1, Math.round(currentHeight * cropPercent));
          const maxLeft = Math.max(0, currentWidth - cropWidth);
          const maxTop = Math.max(0, currentHeight - cropHeight);
          const left = maxLeft > 0 ? Math.floor(Math.random() * maxLeft) : 0;
          const top = maxTop > 0 ? Math.floor(Math.random() * maxTop) : 0;
          const extractWidth = Math.min(cropWidth, currentWidth - left);
          const extractHeight = Math.min(cropHeight, currentHeight - top);
          if (extractWidth > 0 && extractHeight > 0) {
            pipeline = pipeline.extract({ left, top, width: extractWidth, height: extractHeight });
            currentWidth = extractWidth;
            currentHeight = extractHeight;
            transformsApplied.push(`crop_${cropPercent}`);
          }
          break;
        }
      }

      // Get intermediate result to use for next transform
      currentBuffer = await pipeline.toBuffer();

      // Update dimensions from actual output (handles rotation edge cases)
      const intermediateMetadata = await sharp(currentBuffer).metadata();
      if (intermediateMetadata.width && intermediateMetadata.height) {
        currentWidth = intermediateMetadata.width;
        currentHeight = intermediateMetadata.height;
      }
    }

    // Calculate SHA256
    const sha256 = crypto.createHash('sha256').update(currentBuffer).digest('hex');

    return {
      buffer: currentBuffer,
      width: currentWidth,
      height: currentHeight,
      sha256,
      transformsApplied,
    };
  }

  /**
   * Transform bounding box annotations based on applied augmentations
   */
  transformAnnotations(
    annotations: {
      id: string;
      labelClassId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[],
    transforms: { type: string; value?: number }[],
    originalWidth: number,
    originalHeight: number,
    newWidth: number,
    newHeight: number
  ): TransformedAnnotation[] {
    return annotations.map((ann) => {
      let x = ann.x;
      let y = ann.y;
      let w = ann.width;
      let h = ann.height;
      let imgW = originalWidth;
      let imgH = originalHeight;

      for (const transform of transforms) {
        switch (transform.type) {
          case 'flip_horizontal':
            x = imgW - x - w;
            break;

          case 'flip_vertical':
            y = imgH - y - h;
            break;

          case 'rotate': {
            const degrees = transform.value || 90;
            if (degrees === 90) {
              const newX = imgH - y - h;
              const newY = x;
              const newW = h;
              const newH = w;
              x = newX;
              y = newY;
              w = newW;
              h = newH;
              [imgW, imgH] = [imgH, imgW];
            } else if (degrees === 180) {
              x = imgW - x - w;
              y = imgH - y - h;
            } else if (degrees === 270 || degrees === -90) {
              const newX = y;
              const newY = imgW - x - w;
              const newW = h;
              const newH = w;
              x = newX;
              y = newY;
              w = newW;
              h = newH;
              [imgW, imgH] = [imgH, imgW];
            }
            break;
          }

          case 'scale': {
            const scaleFactor = transform.value || 0.8;
            x = Math.round(x * scaleFactor);
            y = Math.round(y * scaleFactor);
            w = Math.round(w * scaleFactor);
            h = Math.round(h * scaleFactor);
            imgW = Math.round(imgW * scaleFactor);
            imgH = Math.round(imgH * scaleFactor);
            break;
          }

          case 'crop':
            // For crop, we'd need to know the exact crop region
            // This is a simplified version - in production, store crop params
            break;
        }
      }

      // Check if annotation is still valid (within bounds)
      const isValid = x >= 0 && y >= 0 && x + w <= newWidth && y + h <= newHeight && w > 0 && h > 0;

      return {
        originalId: ann.id,
        labelClassId: ann.labelClassId,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(w, newWidth - x),
        height: Math.min(h, newHeight - y),
        isValid,
      };
    });
  }

  /**
   * Generate preview of augmentation without saving
   */
  async generatePreview(
    imageBuffer: Buffer,
    transforms: { type: string; value?: number }[],
    originalWidth: number,
    originalHeight: number
  ): Promise<{
    previewBuffer: Buffer;
    previewWidth: number;
    previewHeight: number;
    actualWidth: number;
    actualHeight: number;
  }> {
    const result = await this.augmentImage(imageBuffer, transforms, originalWidth, originalHeight);

    // Create a smaller preview (max 400px)
    const maxDim = 400;
    let previewWidth = result.width;
    let previewHeight = result.height;

    if (result.width > maxDim || result.height > maxDim) {
      const ratio = Math.min(maxDim / result.width, maxDim / result.height);
      previewWidth = Math.max(1, Math.round(result.width * ratio));
      previewHeight = Math.max(1, Math.round(result.height * ratio));
    }

    const previewBuffer = await sharp(result.buffer)
      .resize(previewWidth, previewHeight)
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      previewBuffer,
      previewWidth,
      previewHeight,
      actualWidth: result.width,
      actualHeight: result.height,
    };
  }
}
