import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';

/**
 * Result returned from the ML service generation endpoints.
 */
export interface MLGenerationResult {
  success: boolean;
  seed: number;
  prompt: string;
  controlnet_type: string;
  controlnet_scale: number;
  guidance_scale: number;
  steps: number;
  structural_similarity: number | null;
  hallucination_passed: boolean | null;
  message: string | null;
}

/**
 * Result returned from the ML service hallucination-check endpoint.
 */
export interface MLHallucinationResult {
  passed: boolean;
  similarity_score: number;
  threshold: number;
  message: string;
}

/**
 * RunPod Provider
 *
 * Communicates with the Imagenix ML microservice (FastAPI) deployed
 * on RunPod (or localhost during development).
 *
 * Supports:
 *  - controlnet-canny generation
 *  - dual-control (canny + depth) generation
 *  - safe-augmentation (preset prompts)
 *  - hallucination-check validation
 */
@Injectable()
export class RunPodProvider {
  private readonly logger = new Logger(RunPodProvider.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120_000, // 2 minutes — generation can be slow on CPU
      maxContentLength: 50 * 1024 * 1024, // 50 MB response limit
      maxBodyLength: 50 * 1024 * 1024,
    });

    this.logger.log(`RunPod provider initialised — ML service URL: ${this.baseUrl}`);
  }

  /**
   * Check if the ML service is healthy and reachable.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.client.get('/health', { timeout: 10_000 });
      return res.data?.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Generate with Canny ControlNet.
   *
   * Returns the generated image as a Buffer plus metadata.
   */
  async generateControlNetCanny(
    imageBuffer: Buffer,
    fileName: string,
    prompt: string,
    options?: {
      negativePrompt?: string;
      controlnetScale?: number;
      guidanceScale?: number;
      steps?: number;
      seed?: number;
      outputSize?: number;
    },
  ): Promise<{ buffer: Buffer; metadata: MLGenerationResult }> {
    const form = new FormData();
    form.append('image', imageBuffer, { filename: fileName, contentType: 'image/png' });
    form.append('prompt', prompt);

    if (options?.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options?.controlnetScale != null) form.append('controlnet_scale', String(options.controlnetScale));
    if (options?.guidanceScale != null) form.append('guidance_scale', String(options.guidanceScale));
    if (options?.steps != null) form.append('num_inference_steps', String(options.steps));
    if (options?.seed != null) form.append('seed', String(options.seed));
    if (options?.outputSize != null) form.append('output_size', String(options.outputSize));

    this.logger.log(`[controlnet-canny] Generating: prompt="${prompt}"`);

    // Get metadata (JSON response)
    const metaRes = await this.client.post<MLGenerationResult>(
      '/api/v1/generate/controlnet-canny',
      form,
      { headers: form.getHeaders() },
    );

    // Get the image (PNG response)
    const imgForm = new FormData();
    imgForm.append('image', imageBuffer, { filename: fileName, contentType: 'image/png' });
    imgForm.append('prompt', prompt);
    if (options?.negativePrompt) imgForm.append('negative_prompt', options.negativePrompt);
    if (options?.controlnetScale != null) imgForm.append('controlnet_scale', String(options.controlnetScale));
    if (options?.guidanceScale != null) imgForm.append('guidance_scale', String(options.guidanceScale));
    if (options?.steps != null) imgForm.append('num_inference_steps', String(options.steps));
    if (options?.seed != null) imgForm.append('seed', String(metaRes.data.seed)); // Use same seed
    if (options?.outputSize != null) imgForm.append('output_size', String(options.outputSize));

    const imgRes = await this.client.post(
      '/api/v1/generate/controlnet-canny/image',
      imgForm,
      {
        headers: imgForm.getHeaders(),
        responseType: 'arraybuffer',
      },
    );

    return {
      buffer: Buffer.from(imgRes.data),
      metadata: metaRes.data,
    };
  }

  /**
   * Generate with dual ControlNet (Canny + Depth).
   */
  async generateDualControl(
    imageBuffer: Buffer,
    fileName: string,
    prompt: string,
    options?: {
      negativePrompt?: string;
      cannyScale?: number;
      depthScale?: number;
      guidanceScale?: number;
      steps?: number;
      seed?: number;
      outputSize?: number;
    },
  ): Promise<{ buffer: Buffer; metadata: MLGenerationResult }> {
    const form = new FormData();
    form.append('image', imageBuffer, { filename: fileName, contentType: 'image/png' });
    form.append('prompt', prompt);
    if (options?.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options?.cannyScale != null) form.append('canny_scale', String(options.cannyScale));
    if (options?.depthScale != null) form.append('depth_scale', String(options.depthScale));
    if (options?.guidanceScale != null) form.append('guidance_scale', String(options.guidanceScale));
    if (options?.steps != null) form.append('num_inference_steps', String(options.steps));
    if (options?.seed != null) form.append('seed', String(options.seed));
    if (options?.outputSize != null) form.append('output_size', String(options.outputSize));

    this.logger.log(`[dual-control] Generating: prompt="${prompt}"`);

    const metaRes = await this.client.post<MLGenerationResult>(
      '/api/v1/generate/dual-control',
      form,
      { headers: form.getHeaders() },
    );

    const imgForm = new FormData();
    imgForm.append('image', imageBuffer, { filename: fileName, contentType: 'image/png' });
    imgForm.append('prompt', prompt);
    if (options?.negativePrompt) imgForm.append('negative_prompt', options.negativePrompt);
    if (options?.cannyScale != null) imgForm.append('canny_scale', String(options.cannyScale));
    if (options?.depthScale != null) imgForm.append('depth_scale', String(options.depthScale));
    if (options?.guidanceScale != null) imgForm.append('guidance_scale', String(options.guidanceScale));
    if (options?.steps != null) imgForm.append('num_inference_steps', String(options.steps));
    if (options?.seed != null) imgForm.append('seed', String(metaRes.data.seed));
    if (options?.outputSize != null) imgForm.append('output_size', String(options.outputSize));

    const imgRes = await this.client.post(
      '/api/v1/generate/dual-control/image',
      imgForm,
      {
        headers: imgForm.getHeaders(),
        responseType: 'arraybuffer',
      },
    );

    return {
      buffer: Buffer.from(imgRes.data),
      metadata: metaRes.data,
    };
  }

  /**
   * Safe augmentation using preset prompt templates.
   *
   * Anti-hallucination: the ML service selects the prompt from a curated
   * library — the caller only specifies a variation type (e.g. "rain").
   */
  async generateSafeAugmentation(
    imageBuffer: Buffer,
    fileName: string,
    variationType: string,
    options?: {
      controlnetType?: string;
      controlnetScale?: number;
      seed?: number;
      outputSize?: number;
    },
  ): Promise<{ buffer: Buffer; metadata: MLGenerationResult }> {
    const form = new FormData();
    form.append('image', imageBuffer, { filename: fileName, contentType: 'image/png' });
    form.append('variation_type', variationType);
    if (options?.controlnetType) form.append('controlnet_type', options.controlnetType);
    if (options?.controlnetScale != null) form.append('controlnet_scale', String(options.controlnetScale));
    if (options?.seed != null) form.append('seed', String(options.seed));
    if (options?.outputSize != null) form.append('output_size', String(options.outputSize));

    this.logger.log(`[safe-augmentation] Generating: type="${variationType}"`);

    const metaRes = await this.client.post<MLGenerationResult>(
      '/api/v1/generate/safe-augmentation',
      form,
      { headers: form.getHeaders() },
    );

    const imgForm = new FormData();
    imgForm.append('image', imageBuffer, { filename: fileName, contentType: 'image/png' });
    imgForm.append('variation_type', variationType);
    if (options?.controlnetType) imgForm.append('controlnet_type', options.controlnetType);
    if (options?.controlnetScale != null) imgForm.append('controlnet_scale', String(options.controlnetScale));
    if (options?.seed != null) imgForm.append('seed', String(metaRes.data.seed));
    if (options?.outputSize != null) imgForm.append('output_size', String(options.outputSize));

    const imgRes = await this.client.post(
      '/api/v1/generate/safe-augmentation/image',
      imgForm,
      {
        headers: imgForm.getHeaders(),
        responseType: 'arraybuffer',
      },
    );

    return {
      buffer: Buffer.from(imgRes.data),
      metadata: metaRes.data,
    };
  }

  /**
   * Validate a generated image against the source for hallucination.
   *
   * Sends both images to the ML service which compares their structural
   * edge maps and returns a pass/fail verdict.
   */
  async checkHallucination(
    sourceBuffer: Buffer,
    generatedBuffer: Buffer,
    minSimilarity?: number,
  ): Promise<MLHallucinationResult> {
    const form = new FormData();
    form.append('source_image', sourceBuffer, { filename: 'source.png', contentType: 'image/png' });
    form.append('generated_image', generatedBuffer, { filename: 'generated.png', contentType: 'image/png' });
    if (minSimilarity != null) form.append('min_similarity', String(minSimilarity));

    this.logger.log('[hallucination-check] Validating generated image …');

    const res = await this.client.post<MLHallucinationResult>(
      '/api/v1/validate/hallucination-check',
      form,
      { headers: form.getHeaders() },
    );

    this.logger.log(
      `[hallucination-check] Result: passed=${res.data.passed}, score=${res.data.similarity_score}`,
    );

    return res.data;
  }
}
