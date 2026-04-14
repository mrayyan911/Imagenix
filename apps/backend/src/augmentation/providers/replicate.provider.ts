import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Replicate Provider (Optional Fallback)
 *
 * Uses the Replicate API to run ControlNet models in the cloud when
 * the RunPod ML service is unavailable.
 *
 * Requires REPLICATE_API_TOKEN in .env.
 *
 * This is a lightweight fallback — it only supports controlnet-canny
 * generation via the jagilley/controlnet-canny model on Replicate.
 */
@Injectable()
export class ReplicateProvider {
  private readonly logger = new Logger(ReplicateProvider.name);
  private readonly apiToken: string | undefined;
  private replicate: any = null;

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.get<string>('REPLICATE_API_TOKEN');

    if (this.apiToken) {
      this.logger.log('Replicate provider initialised (API token configured).');
    } else {
      this.logger.warn('Replicate provider: no REPLICATE_API_TOKEN set — provider inactive.');
    }
  }

  /**
   * Check if the Replicate provider is available.
   */
  isAvailable(): boolean {
    return !!this.apiToken;
  }

  /**
   * Lazily initialise the Replicate SDK client.
   */
  private async getClient(): Promise<any> {
    if (!this.apiToken) {
      throw new Error('Replicate API token not configured.');
    }

    if (!this.replicate) {
      try {
        // Dynamic import — replicate is an optional dependency
        // Handle both ESM (default export) and CJS (module.exports) patterns
        const mod = await import('replicate');
        const Replicate: any = typeof mod.default === 'function' ? mod.default : mod;
        this.replicate = new Replicate({ auth: this.apiToken });
      } catch {
        throw new Error(
          'Replicate SDK not installed. Run: npm install replicate',
        );
      }
    }

    return this.replicate;
  }

  /**
   * Generate a Canny ControlNet image via Replicate.
   *
   * Converts the source image to a base64 data URI and sends it to the
   * jagilley/controlnet-canny model.
   *
   * Returns the generated image as a Buffer.
   */
  async generateControlNetCanny(
    imageBuffer: Buffer,
    prompt: string,
    options?: {
      negativePrompt?: string;
      controlnetScale?: number;
      guidanceScale?: number;
      steps?: number;
      seed?: number;
    },
  ): Promise<{ buffer: Buffer; prompt: string }> {
    const client = await this.getClient();

    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    this.logger.log(`[replicate-canny] Generating: prompt="${prompt}"`);

    const output = await client.run(
      'jagilley/controlnet-canny:aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613',
      {
        input: {
          image: base64Image,
          prompt,
          negative_prompt: options?.negativePrompt || 'blurry, distorted, low quality',
          controlnet_conditioning_scale: options?.controlnetScale || 0.95,
          guidance_scale: options?.guidanceScale || 7.0,
          num_inference_steps: options?.steps || 30,
          ...(options?.seed != null ? { seed: options.seed } : {}),
        },
      },
    );

    // Replicate returns [canny_edge_map, generated_image] — use the last element
    const imageUrl = Array.isArray(output) ? output[output.length - 1] : output;

    const { default: axios } = await import('axios');
    const res = await axios.get(imageUrl as string, { responseType: 'arraybuffer' });

    return {
      buffer: Buffer.from(res.data),
      prompt,
    };
  }
}
