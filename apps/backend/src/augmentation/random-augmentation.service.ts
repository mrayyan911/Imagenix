import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as crypto from 'crypto';

export type AugmentationStrength = 'low' | 'medium' | 'high';

export interface RandomTransform {
  type: string;
  value?: number;
  params?: Record<string, number>;
}

export interface RandomAugmentationResult {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
  transforms: RandomTransform[];
  seed: string;
}

export interface TransformedAnnotation {
  originalId: string;
  labelClassId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isValid: boolean;
  visibleArea: number;
}

interface SeededRandom {
  next: () => number;
  nextInt: (min: number, max: number) => number;
  nextFloat: (min: number, max: number) => number;
  nextBool: (probability?: number) => boolean;
  shuffle: <T>(array: T[]) => T[];
  pick: <T>(array: T[]) => T;
}

@Injectable()
export class RandomAugmentationService {
  private readonly MIN_VISIBLE_AREA = 0.2;

  private readonly STRENGTH_CONFIG: Record<AugmentationStrength, {
    minTransforms: number;
    maxTransforms: number;
    intensityMultiplier: number;
  }> = {
    low: { minTransforms: 1, maxTransforms: 2, intensityMultiplier: 0.5 },
    medium: { minTransforms: 2, maxTransforms: 4, intensityMultiplier: 1.0 },
    high: { minTransforms: 3, maxTransforms: 6, intensityMultiplier: 1.5 },
  };

  private createSeededRandom(seed: string): SeededRandom {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    let state = Math.abs(hash) || 1;
    
    const next = (): number => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };

    return {
      next,
      nextInt: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
      nextFloat: (min: number, max: number) => next() * (max - min) + min,
      nextBool: (probability = 0.5) => next() < probability,
      shuffle: <T>(array: T[]): T[] => {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      },
      pick: <T>(array: T[]): T => array[Math.floor(next() * array.length)],
    };
  }

  generateImageSeed(baseSeed: string | undefined, imageId: string): string {
    if (baseSeed) {
      return crypto.createHash('md5').update(`${baseSeed}-${imageId}`).digest('hex');
    }
    return crypto.randomBytes(8).toString('hex');
  }

  selectRandomTransforms(
    strength: AugmentationStrength,
    seed: string,
    imageWidth: number,
    imageHeight: number
  ): RandomTransform[] {
    const rng = this.createSeededRandom(seed);
    const config = this.STRENGTH_CONFIG[strength];
    const intensity = config.intensityMultiplier;

    const geometryTransforms = [
      { type: 'flip_horizontal', weight: 0.5 },
      { type: 'rotate_small', weight: 0.4 },
      { type: 'scale_small', weight: 0.3 },
      { type: 'translate', weight: 0.3 },
      { type: 'safe_crop', weight: 0.2 },
    ];

    const colorTransforms = [
      { type: 'brightness_jitter', weight: 0.5 },
      { type: 'contrast_jitter', weight: 0.5 },
      { type: 'saturation_jitter', weight: 0.4 },
      { type: 'hue_shift', weight: 0.3 },
      { type: 'gamma', weight: 0.3 },
    ];

    const qualityTransforms = [
      { type: 'blur_light', weight: 0.3 },
      { type: 'sharpen_light', weight: 0.3 },
      { type: 'jpeg_compress', weight: 0.2 },
    ];

    const allTransforms = [...geometryTransforms, ...colorTransforms, ...qualityTransforms];
    const selectedTransforms: RandomTransform[] = [];

    const numTransforms = rng.nextInt(config.minTransforms, config.maxTransforms);

    const shuffled = rng.shuffle(allTransforms);
    
    for (const t of shuffled) {
      if (selectedTransforms.length >= numTransforms) break;
      if (rng.nextBool(t.weight * intensity)) {
        const transform = this.generateTransformParams(t.type, rng, intensity, imageWidth, imageHeight);
        if (transform) {
          selectedTransforms.push(transform);
        }
      }
    }

    if (selectedTransforms.length < config.minTransforms) {
      for (const t of shuffled) {
        if (selectedTransforms.length >= config.minTransforms) break;
        if (!selectedTransforms.find(s => s.type === t.type)) {
          const transform = this.generateTransformParams(t.type, rng, intensity, imageWidth, imageHeight);
          if (transform) {
            selectedTransforms.push(transform);
          }
        }
      }
    }

    return this.orderTransforms(selectedTransforms, rng);
  }

  private generateTransformParams(
    type: string,
    rng: SeededRandom,
    intensity: number,
    imageWidth: number,
    imageHeight: number
  ): RandomTransform | null {
    switch (type) {
      case 'flip_horizontal':
        return { type: 'flip_horizontal' };

      case 'rotate_small':
        const maxRotation = 10 * intensity;
        const rotation = rng.nextFloat(-maxRotation, maxRotation);
        return { type: 'rotate', value: rotation, params: { degrees: rotation } };

      case 'scale_small':
        const scaleRange = 0.1 * intensity;
        const scale = rng.nextFloat(1 - scaleRange, 1 + scaleRange);
        return { type: 'scale', value: scale, params: { factor: scale } };

      case 'translate':
        const maxShiftX = Math.round(imageWidth * 0.05 * intensity);
        const maxShiftY = Math.round(imageHeight * 0.05 * intensity);
        const shiftX = rng.nextInt(-maxShiftX, maxShiftX);
        const shiftY = rng.nextInt(-maxShiftY, maxShiftY);
        return { type: 'translate', params: { x: shiftX, y: shiftY } };

      case 'safe_crop':
        const cropPercent = rng.nextFloat(0.9, 0.98);
        return { type: 'safe_crop', value: cropPercent, params: { percent: cropPercent } };

      case 'brightness_jitter':
        const brightnessRange = 0.2 * intensity;
        const brightness = rng.nextFloat(1 - brightnessRange, 1 + brightnessRange);
        return { type: 'brightness', value: brightness, params: { factor: brightness } };

      case 'contrast_jitter':
        const contrastRange = 0.2 * intensity;
        const contrast = rng.nextFloat(1 - contrastRange, 1 + contrastRange);
        return { type: 'contrast', value: contrast, params: { factor: contrast } };

      case 'saturation_jitter':
        const saturationRange = 0.3 * intensity;
        const saturation = rng.nextFloat(1 - saturationRange, 1 + saturationRange);
        return { type: 'saturation', value: saturation, params: { factor: saturation } };

      case 'hue_shift':
        const hueRange = 15 * intensity;
        const hue = rng.nextInt(-Math.round(hueRange), Math.round(hueRange));
        return { type: 'hue', value: hue, params: { degrees: hue } };

      case 'gamma':
        const gammaRange = 0.2 * intensity;
        const gamma = rng.nextFloat(1 - gammaRange, 1 + gammaRange);
        return { type: 'gamma', value: gamma, params: { value: gamma } };

      case 'blur_light':
        const blurSigma = rng.nextFloat(0.3, 1.0 * intensity);
        return { type: 'blur', value: blurSigma, params: { sigma: blurSigma } };

      case 'sharpen_light':
        const sharpenSigma = rng.nextFloat(0.3, 0.8 * intensity);
        return { type: 'sharpen', value: sharpenSigma, params: { sigma: sharpenSigma } };

      case 'jpeg_compress':
        const quality = rng.nextInt(Math.round(85 - 10 * intensity), 95);
        return { type: 'jpeg_compress', value: quality, params: { quality } };

      default:
        return null;
    }
  }

  private orderTransforms(transforms: RandomTransform[], rng: SeededRandom): RandomTransform[] {
    const geometry = transforms.filter(t => 
      ['flip_horizontal', 'rotate', 'scale', 'translate', 'safe_crop'].includes(t.type)
    );
    const color = transforms.filter(t => 
      ['brightness', 'contrast', 'saturation', 'hue', 'gamma'].includes(t.type)
    );
    const quality = transforms.filter(t => 
      ['blur', 'sharpen', 'jpeg_compress'].includes(t.type)
    );

    return [
      ...rng.shuffle(geometry),
      ...rng.shuffle(color),
      ...rng.shuffle(quality),
    ];
  }

  async applyRandomAugmentation(
    imageBuffer: Buffer,
    transforms: RandomTransform[],
    originalWidth: number,
    originalHeight: number
  ): Promise<RandomAugmentationResult & { cropParams?: { left: number; top: number; width: number; height: number } }> {
    let currentBuffer = imageBuffer;
    let currentWidth = originalWidth;
    let currentHeight = originalHeight;
    const appliedTransforms: RandomTransform[] = [];
    let cropParams: { left: number; top: number; width: number; height: number } | undefined;

    for (const transform of transforms) {
      let pipeline = sharp(currentBuffer);

      try {
        switch (transform.type) {
          case 'flip_horizontal':
            pipeline = pipeline.flop();
            appliedTransforms.push(transform);
            break;

          case 'rotate':
            const degrees = transform.value || 0;
            if (Math.abs(degrees) > 0.5) {
              pipeline = pipeline.rotate(degrees, { 
                background: { r: 128, g: 128, b: 128, alpha: 1 } 
              });
              appliedTransforms.push(transform);
            }
            break;

          case 'scale':
            const scaleFactor = transform.value || 1;
            if (Math.abs(scaleFactor - 1) > 0.01) {
              const newWidth = Math.max(1, Math.round(currentWidth * scaleFactor));
              const newHeight = Math.max(1, Math.round(currentHeight * scaleFactor));
              pipeline = pipeline.resize(newWidth, newHeight);
              currentWidth = newWidth;
              currentHeight = newHeight;
              appliedTransforms.push(transform);
            }
            break;

          case 'translate':
            const shiftX = transform.params?.x || 0;
            const shiftY = transform.params?.y || 0;
            if (Math.abs(shiftX) > 0 || Math.abs(shiftY) > 0) {
              pipeline = pipeline.extend({
                top: Math.max(0, -shiftY),
                bottom: Math.max(0, shiftY),
                left: Math.max(0, -shiftX),
                right: Math.max(0, shiftX),
                background: { r: 128, g: 128, b: 128, alpha: 1 },
              }).extract({
                left: Math.max(0, shiftX),
                top: Math.max(0, shiftY),
                width: currentWidth,
                height: currentHeight,
              });
              appliedTransforms.push(transform);
            }
            break;

          case 'safe_crop':
            const cropPercent = transform.value || 0.95;
            const cropWidth = Math.max(1, Math.round(currentWidth * cropPercent));
            const cropHeight = Math.max(1, Math.round(currentHeight * cropPercent));
            const maxLeft = Math.max(0, currentWidth - cropWidth);
            const maxTop = Math.max(0, currentHeight - cropHeight);
            const left = Math.floor(maxLeft / 2);
            const top = Math.floor(maxTop / 2);
            
            if (cropWidth < currentWidth || cropHeight < currentHeight) {
              pipeline = pipeline.extract({ left, top, width: cropWidth, height: cropHeight });
              cropParams = { left, top, width: cropWidth, height: cropHeight };
              currentWidth = cropWidth;
              currentHeight = cropHeight;
              appliedTransforms.push({ ...transform, params: { ...transform.params, left, top, width: cropWidth, height: cropHeight } });
            }
            break;

          case 'brightness':
            const brightness = transform.value || 1;
            pipeline = pipeline.modulate({ brightness });
            appliedTransforms.push(transform);
            break;

          case 'contrast':
            const contrast = transform.value || 1;
            pipeline = pipeline.linear(contrast, -(128 * contrast) + 128);
            appliedTransforms.push(transform);
            break;

          case 'saturation':
            const saturation = transform.value || 1;
            pipeline = pipeline.modulate({ saturation });
            appliedTransforms.push(transform);
            break;

          case 'hue':
            const hue = transform.value || 0;
            if (Math.abs(hue) > 0) {
              pipeline = pipeline.modulate({ hue });
              appliedTransforms.push(transform);
            }
            break;

          case 'gamma':
            const gamma = transform.value || 1;
            if (Math.abs(gamma - 1) > 0.01) {
              pipeline = pipeline.gamma(gamma);
              appliedTransforms.push(transform);
            }
            break;

          case 'blur':
            const blurSigma = transform.value || 0.5;
            if (blurSigma >= 0.3) {
              pipeline = pipeline.blur(blurSigma);
              appliedTransforms.push(transform);
            }
            break;

          case 'sharpen':
            const sharpenSigma = transform.value || 0.5;
            pipeline = pipeline.sharpen({ sigma: sharpenSigma });
            appliedTransforms.push(transform);
            break;

          case 'jpeg_compress':
            const quality = transform.value || 90;
            currentBuffer = await pipeline.toBuffer();
            pipeline = sharp(currentBuffer).jpeg({ quality }).png();
            appliedTransforms.push(transform);
            break;
        }

        currentBuffer = await pipeline.toBuffer();
        const metadata = await sharp(currentBuffer).metadata();
        if (metadata.width && metadata.height) {
          currentWidth = metadata.width;
          currentHeight = metadata.height;
        }
      } catch (err) {
        console.warn(`Transform ${transform.type} failed:`, err);
      }
    }

    // Final encode as JPEG for smaller file size and faster I/O
    currentBuffer = await sharp(currentBuffer)
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const sha256 = crypto.createHash('sha256').update(currentBuffer).digest('hex');

    return {
      buffer: currentBuffer,
      width: currentWidth,
      height: currentHeight,
      sha256,
      transforms: appliedTransforms,
      seed: '',
      cropParams,
    };
  }

  transformAnnotations(
    annotations: { id: string; labelClassId: string; x: number; y: number; width: number; height: number }[],
    transforms: RandomTransform[],
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
      const originalArea = w * h;

      for (const transform of transforms) {
        switch (transform.type) {
          case 'flip_horizontal':
            x = imgW - x - w;
            break;

          case 'rotate':
            const degrees = transform.value || 0;
            const radians = (degrees * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const cx = imgW / 2;
            const cy = imgH / 2;
            
            const corners = [
              { x: x, y: y },
              { x: x + w, y: y },
              { x: x + w, y: y + h },
              { x: x, y: y + h },
            ];

            const rotatedCorners = corners.map(c => ({
              x: cos * (c.x - cx) - sin * (c.y - cy) + cx,
              y: sin * (c.x - cx) + cos * (c.y - cy) + cy,
            }));

            const minX = Math.min(...rotatedCorners.map(c => c.x));
            const maxX = Math.max(...rotatedCorners.map(c => c.x));
            const minY = Math.min(...rotatedCorners.map(c => c.y));
            const maxY = Math.max(...rotatedCorners.map(c => c.y));

            x = minX;
            y = minY;
            w = maxX - minX;
            h = maxY - minY;
            break;

          case 'scale':
            const scaleFactor = transform.value || 1;
            x = Math.round(x * scaleFactor);
            y = Math.round(y * scaleFactor);
            w = Math.round(w * scaleFactor);
            h = Math.round(h * scaleFactor);
            imgW = Math.round(imgW * scaleFactor);
            imgH = Math.round(imgH * scaleFactor);
            break;

          case 'translate':
            const shiftX = transform.params?.x || 0;
            const shiftY = transform.params?.y || 0;
            x -= shiftX;
            y -= shiftY;
            break;

          case 'safe_crop':
            const cropLeft = transform.params?.left || 0;
            const cropTop = transform.params?.top || 0;
            x -= cropLeft;
            y -= cropTop;
            imgW = transform.params?.width || imgW;
            imgH = transform.params?.height || imgH;
            break;
        }
      }

      const clampedX = Math.max(0, x);
      const clampedY = Math.max(0, y);
      const clampedW = Math.min(w, newWidth - clampedX);
      const clampedH = Math.min(h, newHeight - clampedY);

      const clampedArea = Math.max(0, clampedW) * Math.max(0, clampedH);
      const visibleArea = originalArea > 0 ? clampedArea / originalArea : 0;

      const isValid = 
        clampedW > 2 && 
        clampedH > 2 && 
        visibleArea >= this.MIN_VISIBLE_AREA &&
        clampedX >= 0 && 
        clampedY >= 0 &&
        clampedX + clampedW <= newWidth &&
        clampedY + clampedH <= newHeight;

      return {
        originalId: ann.id,
        labelClassId: ann.labelClassId,
        x: Math.round(Math.max(0, clampedX)),
        y: Math.round(Math.max(0, clampedY)),
        width: Math.round(Math.max(1, clampedW)),
        height: Math.round(Math.max(1, clampedH)),
        isValid,
        visibleArea,
      };
    });
  }

  async generatePreview(
    imageBuffer: Buffer,
    strength: AugmentationStrength,
    seed: string,
    originalWidth: number,
    originalHeight: number
  ): Promise<{
    previewBuffer: Buffer;
    previewWidth: number;
    previewHeight: number;
    actualWidth: number;
    actualHeight: number;
    transforms: RandomTransform[];
    seed: string;
  }> {
    const transforms = this.selectRandomTransforms(strength, seed, originalWidth, originalHeight);
    const result = await this.applyRandomAugmentation(imageBuffer, transforms, originalWidth, originalHeight);

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
      .jpeg({ quality: 85 })
      .toBuffer();

    return {
      previewBuffer,
      previewWidth,
      previewHeight,
      actualWidth: result.width,
      actualHeight: result.height,
      transforms: result.transforms,
      seed,
    };
  }
}
