import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunPodProvider, MLGenerationResult } from './providers/runpod.provider';
import { ReplicateProvider } from './providers/replicate.provider';

/**
 * Validated generation result returned to callers.
 */
export interface GenerativeResult {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
  prompt: string;
  variationType: string;
  /** Whether the anti-hallucination check passed */
  validated: boolean;
  /** Structural similarity score (0–1) */
  similarityScore: number | null;
  /** Number of generation attempts before a valid result was obtained */
  attempts: number;
}

/**
 * Generative Augmentation Service
 *
 * Implements Stable Diffusion + ControlNet augmentation with strong
 * anti-hallucination safeguards:
 *
 *   1. Structure-preserving generation via ControlNet (canny / depth / HED)
 *   2. Curated prompt templates (safe-augmentation mode)
 *   3. Post-generation hallucination check (edge-based structural similarity)
 *   4. Automatic retry (up to 3 attempts) when hallucination is detected
 *
 * Provider selection:
 *   GENERATIVE_PROVIDER=runpod  → calls the FastAPI ML microservice
 *   GENERATIVE_PROVIDER=replicate → calls Replicate API (fallback)
 */
@Injectable()
export class GenerativeAugmentationService {
  private readonly logger = new Logger(GenerativeAugmentationService.name);
  private readonly isEnabled: boolean;
  private readonly provider: string | undefined;
  private readonly maxRetries = 3;

  constructor(
    private configService: ConfigService,
    private runpodProvider: RunPodProvider,
    private replicateProvider: ReplicateProvider,
  ) {
    this.isEnabled =
      this.configService.get<string>('FEATURE_GENERATIVE_AUGMENTATION') === 'true';
    this.provider = this.configService.get<string>('GENERATIVE_PROVIDER');

    this.logger.log(
      `Generative augmentation: enabled=${this.isEnabled}, provider=${this.provider || 'none'}`,
    );
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Check if generative augmentation is available.
   */
  isAvailable(): boolean {
    if (!this.isEnabled) return false;
    if (this.provider === 'runpod') return true;
    if (this.provider === 'replicate') return this.replicateProvider.isAvailable();
    return false;
  }

  /**
   * Get available variation types.
   */
  getAvailableVariations(): string[] {
    return [
      'weather',
      'lighting',
      'background',
      'style_transfer',
      'object_variation',
      // Safe-augmentation presets
      'rain',
      'snow',
      'night',
      'golden_hour',
      'overcast',
      'foggy',
      'nature',
    ];
  }

  /**
   * Generate a safe, structure-preserving variation with anti-hallucination
   * validation and automatic retry.
   *
   * Anti-hallucination flow:
   *   1. Generate image via ControlNet
   *   2. Send source + generated to /validate/hallucination-check
   *   3. If similarity < threshold → retry (up to maxRetries)
   *   4. Return result with {buffer, validated, attempts}
   */
  async generateVariation(
    sourceImageBuffer: Buffer,
    variationType: string,
    prompt?: string,
    sourceWidth?: number,
    sourceHeight?: number,
  ): Promise<GenerativeResult> {
    if (!this.isEnabled) {
      throw new Error(
        'Generative augmentation is not enabled. Set FEATURE_GENERATIVE_AUGMENTATION=true',
      );
    }

    const resolvedPrompt = this.buildPrompt(variationType, prompt);

    if (this.provider === 'runpod') {
      return this.generateWithRunPod(
        sourceImageBuffer,
        variationType,
        resolvedPrompt,
      );
    }

    if (this.provider === 'replicate') {
      return this.generateWithReplicate(
        sourceImageBuffer,
        variationType,
        resolvedPrompt,
      );
    }

    throw new Error(
      `No valid GENERATIVE_PROVIDER configured. ` +
      `Set GENERATIVE_PROVIDER to 'runpod' or 'replicate'.`,
    );
  }

  /**
   * Estimate cost for generation (useful for user feedback).
   */
  estimateCost(
    imageCount: number,
    variationsPerImage: number,
  ): { credits: number; estimatedUSD: number } {
    const creditsPerGeneration = 1;
    const totalGenerations = imageCount * variationsPerImage;
    const credits = totalGenerations * creditsPerGeneration;
    const costPerCredit = this.provider === 'replicate' ? 0.05 : 0.02;
    const estimatedUSD = credits * costPerCredit;
    return { credits, estimatedUSD };
  }

  // ── Private: RunPod Provider ──────────────────────────────────────

  private async generateWithRunPod(
    sourceBuffer: Buffer,
    variationType: string,
    prompt: string,
  ): Promise<GenerativeResult> {
    const safeTypes = [
      'rain', 'snow', 'night', 'golden_hour', 'overcast', 'foggy', 'nature',
    ];

    let lastResult: { buffer: Buffer; metadata: MLGenerationResult } | null = null;
    let validated = false;
    let similarityScore: number | null = null;
    let attempts = 0;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      attempts = attempt;
      this.logger.log(
        `[RunPod] Generation attempt ${attempt}/${this.maxRetries} for "${variationType}"`,
      );

      try {
        // Choose generation endpoint based on variation type
        if (safeTypes.includes(variationType)) {
          // Use safe-augmentation endpoint (curated prompt templates)
          lastResult = await this.runpodProvider.generateSafeAugmentation(
            sourceBuffer,
            'source.png',
            variationType,
          );
        } else {
          // Use controlnet-canny for free-form prompts
          lastResult = await this.runpodProvider.generateControlNetCanny(
            sourceBuffer,
            'source.png',
            prompt,
          );
        }

        // Anti-hallucination: validate the generated image
        const validation = await this.runpodProvider.checkHallucination(
          sourceBuffer,
          lastResult.buffer,
        );

        similarityScore = validation.similarity_score;
        validated = validation.passed;

        if (validated) {
          this.logger.log(
            `[RunPod] Generation validated on attempt ${attempt}: ` +
            `similarity=${similarityScore}`,
          );
          break;
        }

        this.logger.warn(
          `[RunPod] Hallucination detected on attempt ${attempt}: ` +
          `similarity=${similarityScore} — ${attempt < this.maxRetries ? 'retrying' : 'giving up'}`,
        );
      } catch (error) {
        this.logger.error(
          `[RunPod] Attempt ${attempt} failed: ${error instanceof Error ? error.message : error}`,
        );
        if (attempt === this.maxRetries) {
          throw new Error(
            `Generative augmentation failed after ${this.maxRetries} attempts: ` +
            `${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    if (!lastResult) {
      throw new Error('Generation produced no result.');
    }

    // Compute sha256 of the generated buffer
    const crypto = await import('crypto');
    const sha256 = crypto.createHash('sha256').update(lastResult.buffer).digest('hex');

    return {
      buffer: lastResult.buffer,
      width: 512, // Default pipeline output size
      height: 512,
      sha256,
      prompt: lastResult.metadata.prompt,
      variationType,
      validated,
      similarityScore,
      attempts,
    };
  }

  // ── Private: Replicate Provider (Fallback) ────────────────────────

  private async generateWithReplicate(
    sourceBuffer: Buffer,
    variationType: string,
    prompt: string,
  ): Promise<GenerativeResult> {
    this.logger.log(`[Replicate] Generating: type="${variationType}"`);

    const result = await this.replicateProvider.generateControlNetCanny(
      sourceBuffer,
      prompt,
    );

    const crypto = await import('crypto');
    const sha256 = crypto.createHash('sha256').update(result.buffer).digest('hex');

    // Replicate does not have a built-in hallucination check,
    // so we mark as not validated (caller should use RunPod for validation)
    return {
      buffer: result.buffer,
      width: 512,
      height: 512,
      sha256,
      prompt: result.prompt,
      variationType,
      validated: false,
      similarityScore: null,
      attempts: 1,
    };
  }

  // ── Private: Prompt Builder ───────────────────────────────────────

  private buildPrompt(variationType: string, customPrompt?: string): string {
    const basePrompts: Record<string, string> = {
      weather: 'Same scene with different weather conditions',
      lighting: 'Same scene with different lighting conditions',
      background: 'Same objects with different background',
      style_transfer: 'Same content in different artistic style',
      object_variation: 'Similar objects with slight variations',
      rain: 'same scene with heavy rain, wet surfaces, overcast sky, highly detailed',
      snow: 'same scene with snow, snowflakes, winter atmosphere, highly detailed',
      night: 'same scene at night, dark sky, street lights, moonlight, highly detailed',
      golden_hour: 'same scene during golden hour, warm sunlight, long shadows, highly detailed',
      overcast: 'same scene on overcast day, grey clouds, diffused lighting, highly detailed',
      foggy: 'same scene with dense fog, low visibility, atmospheric haze, highly detailed',
      nature: 'same scene with lush green nature, trees, vegetation, highly detailed',
    };

    const base = basePrompts[variationType] || 'Generate a variation of this image';
    return customPrompt ? `${base}. ${customPrompt}` : base;
  }
}
