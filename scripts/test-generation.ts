/**
 * Test Generation Script
 *
 * Sends a test image to the ML service's safe-augmentation endpoint,
 * saves the output, and runs a hallucination check.
 *
 * Usage:
 *   npx ts-node scripts/test-generation.ts [image-path]
 *
 * Defaults to a small generated test image if no path is provided.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'demo-output');

async function ensureOutputDir(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Create a simple test image (solid colour with a border) if no input is given.
 */
function getTestImageBuffer(imagePath?: string): Buffer {
  if (imagePath && fs.existsSync(imagePath)) {
    console.log(`Using image: ${imagePath}`);
    return fs.readFileSync(imagePath);
  }

  // Create a minimal 100×100 BMP as fallback (valid image for testing)
  console.log('No image path provided — please provide a valid image file.');
  console.log('Usage: npx ts-node scripts/test-generation.ts <path-to-image>');
  process.exit(1);
}

async function checkHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 10000 });
    console.log('ML Service Health:', JSON.stringify(res.data, null, 2));
    return res.data.status === 'healthy';
  } catch (err: any) {
    console.error(`ML Service not reachable at ${ML_SERVICE_URL}:`, err.message);
    return false;
  }
}

async function generateSafeAugmentation(imageBuffer: Buffer): Promise<Buffer | null> {
  const form = new FormData();
  form.append('image', imageBuffer, { filename: 'test.png', contentType: 'image/png' });
  form.append('variation_type', 'rain');
  form.append('controlnet_type', 'canny');

  console.log('\n--- Safe Augmentation (rain, canny) ---');

  try {
    // Get metadata
    const metaRes = await axios.post(
      `${ML_SERVICE_URL}/api/v1/generate/safe-augmentation`,
      form,
      { headers: form.getHeaders(), timeout: 120000 },
    );
    console.log('Generation result:', JSON.stringify(metaRes.data, null, 2));

    // Get image
    const imgForm = new FormData();
    imgForm.append('image', imageBuffer, { filename: 'test.png', contentType: 'image/png' });
    imgForm.append('variation_type', 'rain');
    imgForm.append('controlnet_type', 'canny');
    if (metaRes.data.seed) imgForm.append('seed', String(metaRes.data.seed));

    const imgRes = await axios.post(
      `${ML_SERVICE_URL}/api/v1/generate/safe-augmentation/image`,
      imgForm,
      { headers: imgForm.getHeaders(), responseType: 'arraybuffer', timeout: 120000 },
    );

    return Buffer.from(imgRes.data);
  } catch (err: any) {
    console.error('Generation failed:', err.response?.data || err.message);
    return null;
  }
}

async function runHallucinationCheck(
  sourceBuffer: Buffer,
  generatedBuffer: Buffer,
): Promise<void> {
  const form = new FormData();
  form.append('source_image', sourceBuffer, { filename: 'source.png', contentType: 'image/png' });
  form.append('generated_image', generatedBuffer, { filename: 'generated.png', contentType: 'image/png' });

  console.log('\n--- Hallucination Check ---');

  try {
    const res = await axios.post(
      `${ML_SERVICE_URL}/api/v1/validate/hallucination-check`,
      form,
      { headers: form.getHeaders(), timeout: 30000 },
    );
    console.log('Hallucination check result:', JSON.stringify(res.data, null, 2));

    if (res.data.passed) {
      console.log('✓ Image passed hallucination check.');
    } else {
      console.log('✗ Image FAILED hallucination check — structure deviates from source.');
    }
  } catch (err: any) {
    console.error('Hallucination check failed:', err.response?.data || err.message);
  }
}

async function main(): Promise<void> {
  console.log('=== Imagenix Test Generation Script ===');
  console.log(`ML Service URL: ${ML_SERVICE_URL}\n`);

  await ensureOutputDir();

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    console.error('\nML service is not healthy. Start it first:');
    console.error('  cd apps/ml-service && python main.py');
    process.exit(1);
  }

  // Load test image
  const imageBuffer = getTestImageBuffer(process.argv[2]);

  // Generate safe augmentation
  const generated = await generateSafeAugmentation(imageBuffer);

  if (generated) {
    // Save output
    const outputPath = path.join(OUTPUT_DIR, 'test-generation-rain.png');
    fs.writeFileSync(outputPath, generated);
    console.log(`\nSaved generated image: ${outputPath}`);

    // Run hallucination check
    await runHallucinationCheck(imageBuffer, generated);
  }

  console.log('\n=== Test complete ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
