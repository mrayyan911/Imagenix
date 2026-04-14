/**
 * Demo Teacher Script
 *
 * Generates 5 augmented variations of a source image using different
 * weather/environment conditions to demonstrate the system's ability
 * to produce diverse, structure-preserving augmentations.
 *
 * Variations:
 *   1. Rain       — rainy weather overlay
 *   2. Snow       — snowy winter scene
 *   3. Night      — nighttime lighting
 *   4. Golden Hour — warm sunset lighting
 *   5. Nature     — lush green surroundings
 *
 * Usage:
 *   npx ts-node scripts/demo-teacher.ts <path-to-image>
 *
 * Output is saved to demo-output/ in the project root.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'demo-output');

interface VariationConfig {
  name: string;
  type: string;
  controlnet: string;
}

const VARIATIONS: VariationConfig[] = [
  { name: 'rain', type: 'rain', controlnet: 'canny' },
  { name: 'snow', type: 'snow', controlnet: 'canny' },
  { name: 'night', type: 'night', controlnet: 'canny' },
  { name: 'golden_hour', type: 'golden_hour', controlnet: 'canny' },
  { name: 'nature', type: 'nature', controlnet: 'canny' },
];

async function ensureOutputDir(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function checkHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 10000 });
    return res.data.status === 'healthy';
  } catch {
    return false;
  }
}

async function generateVariation(
  imageBuffer: Buffer,
  variation: VariationConfig,
): Promise<{ buffer: Buffer | null; metadata: any }> {
  // Get metadata
  const metaForm = new FormData();
  metaForm.append('image', imageBuffer, { filename: 'source.png', contentType: 'image/png' });
  metaForm.append('variation_type', variation.type);
  metaForm.append('controlnet_type', variation.controlnet);

  try {
    const metaRes = await axios.post(
      `${ML_SERVICE_URL}/api/v1/generate/safe-augmentation`,
      metaForm,
      { headers: metaForm.getHeaders(), timeout: 180000 },
    );

    // Get image using the same seed for reproducibility
    const imgForm = new FormData();
    imgForm.append('image', imageBuffer, { filename: 'source.png', contentType: 'image/png' });
    imgForm.append('variation_type', variation.type);
    imgForm.append('controlnet_type', variation.controlnet);
    if (metaRes.data.seed) imgForm.append('seed', String(metaRes.data.seed));

    const imgRes = await axios.post(
      `${ML_SERVICE_URL}/api/v1/generate/safe-augmentation/image`,
      imgForm,
      { headers: imgForm.getHeaders(), responseType: 'arraybuffer', timeout: 180000 },
    );

    return {
      buffer: Buffer.from(imgRes.data),
      metadata: metaRes.data,
    };
  } catch (err: any) {
    console.error(`  Failed: ${err.response?.data?.detail || err.message}`);
    return { buffer: null, metadata: null };
  }
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       Imagenix Demo Teacher Script          ║');
  console.log('║  Generate 5 weather/environment variations   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`ML Service: ${ML_SERVICE_URL}\n`);

  // Validate input
  const imagePath = process.argv[2];
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('Usage: npx ts-node scripts/demo-teacher.ts <path-to-image>');
    console.error('  Provide a valid path to a source image.');
    process.exit(1);
  }

  await ensureOutputDir();

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    console.error('ML service not reachable. Start it first:');
    console.error('  cd apps/ml-service && python main.py');
    process.exit(1);
  }
  console.log('ML service is healthy.\n');

  const imageBuffer = fs.readFileSync(imagePath);
  const baseName = path.basename(imagePath, path.extname(imagePath));

  // Copy source to output for comparison
  const sourceCopy = path.join(OUTPUT_DIR, `${baseName}_00_original${path.extname(imagePath)}`);
  fs.copyFileSync(imagePath, sourceCopy);
  console.log(`Source image copied to: ${sourceCopy}\n`);

  // Generate all variations
  const results: Array<{ name: string; file: string; metadata: any }> = [];

  for (let i = 0; i < VARIATIONS.length; i++) {
    const v = VARIATIONS[i];
    const num = String(i + 1).padStart(2, '0');
    console.log(`[${num}/${VARIATIONS.length}] Generating "${v.name}" variation …`);

    const { buffer, metadata } = await generateVariation(imageBuffer, v);

    if (buffer) {
      const outFile = path.join(OUTPUT_DIR, `${baseName}_${num}_${v.name}.png`);
      fs.writeFileSync(outFile, buffer);
      console.log(`  Saved: ${outFile}`);
      console.log(`  Similarity: ${metadata?.structural_similarity ?? 'N/A'}`);
      console.log(`  Hallucination check: ${metadata?.hallucination_passed ? 'PASSED' : 'FAILED'}`);
      results.push({ name: v.name, file: outFile, metadata });
    } else {
      console.log(`  Skipped (generation failed).`);
    }
    console.log();
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('                   SUMMARY                     ');
  console.log('═══════════════════════════════════════════════');
  console.log(`Source: ${imagePath}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Generated: ${results.length}/${VARIATIONS.length}\n`);

  for (const r of results) {
    const sim = r.metadata?.structural_similarity?.toFixed(4) ?? 'N/A';
    const pass = r.metadata?.hallucination_passed ? 'PASS' : 'FAIL';
    console.log(`  ${r.name.padEnd(14)} similarity=${sim}  check=${pass}`);
  }

  // Save metadata report
  const reportPath = path.join(OUTPUT_DIR, `${baseName}_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results.map(r => ({
    variation: r.name,
    file: path.basename(r.file),
    ...r.metadata,
  })), null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  console.log('\nDemo complete!');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
