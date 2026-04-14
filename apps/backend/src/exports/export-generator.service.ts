import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import * as archiver from 'archiver';
import * as sharp from 'sharp';

interface AnnotationData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  labelClass: {
    id: string;
    name: string;
  };
}

interface ImageData {
  id: string;
  fileName: string;
  fileKey: string;
  width: number;
  height: number;
  annotations: AnnotationData[];
}

@Injectable()
export class ExportGeneratorService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private storageService: StorageService
  ) {}

  async generate(
    jobId: string,
    datasetId: string,
    format: 'coco' | 'yolo' | 'voc' | 'labeled_png' | 'labeled_jpg',
    includeImages: boolean,
    annotationStatus: string[],
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<Buffer> {
    console.log(`[ExportGenerator] Generating ${format} export for dataset ${datasetId}`);

    // Get dataset with images and annotations
    const images = await this.prisma.image.findMany({
      where: { datasetId },
      include: {
        annotations: {
          where: {
            status: { in: annotationStatus },
          },
          include: {
            labelClass: true,
          },
        },
      },
    });

    // Get all label classes for the project
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        project: {
          include: {
            labelClasses: true,
          },
        },
      },
    });

    const labelClasses = dataset?.project.labelClasses || [];

    // Handle labeled image exports (PNG/JPG with annotations drawn)
    if (format === 'labeled_png' || format === 'labeled_jpg') {
      // For labeled exports, include all annotations regardless of status
      const imagesWithAllAnnotations = await this.prisma.image.findMany({
        where: { datasetId },
        include: {
          annotations: {
            include: {
              labelClass: true,
            },
          },
        },
      });

      console.log(`[ExportGenerator] Found ${imagesWithAllAnnotations.length} images`);
      const totalAnnotations = imagesWithAllAnnotations.reduce((sum, img) => sum + img.annotations.length, 0);
      console.log(`[ExportGenerator] Total annotations: ${totalAnnotations}`);

      return this.generateLabeledImages(
        imagesWithAllAnnotations as unknown as ImageData[],
        labelClasses,
        format === 'labeled_png' ? 'png' : 'jpg',
        progressCallback
      );
    }

    // Generate format-specific content
    let annotationContent: Record<string, string | Buffer>;

    switch (format) {
      case 'coco':
        annotationContent = this.generateCOCO(images, labelClasses);
        break;
      case 'yolo':
        annotationContent = this.generateYOLO(images, labelClasses);
        break;
      case 'voc':
        annotationContent = this.generateVOC(images);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add annotation files
      for (const [filename, content] of Object.entries(annotationContent)) {
        if (typeof content === 'string') {
          archive.append(content, { name: filename });
        } else {
          archive.append(content, { name: filename });
        }
      }

      // Add README
      archive.append(this.generateReadme(format, images.length, labelClasses.length), {
        name: 'README.txt',
      });

      // Note: For a real implementation with includeImages=true,
      // you would download images from S3 and add them to the archive.
      // This is omitted for performance in the demo.
      if (includeImages) {
        archive.append(
          'Images are referenced by filename. Download separately from the platform.',
          { name: 'images/README.txt' }
        );
      }

      archive.finalize();
    });
  }

  private async generateLabeledImages(
    images: ImageData[],
    labelClasses: { id: string; name: string; colorHex: string }[],
    outputFormat: 'png' | 'jpg',
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<Buffer> {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    // Build color map for label classes
    const colorMap = new Map<string, string>();
    labelClasses.forEach((lc) => {
      colorMap.set(lc.id, lc.colorHex || '#3B82F6');
    });

    // Default colors for classes without assigned color
    const defaultColors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1',
    ];

    return new Promise(async (resolve, reject) => {
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      let processedCount = 0;
      const totalImages = images.length;

      for (const img of images) {
        try {
          console.log(`[ExportGenerator] Processing ${img.fileName} with ${img.annotations.length} annotations`);
          
          // Download original image from storage
          const imageBuffer = await this.storageService.downloadFile(img.fileKey);

          // Get image metadata
          const metadata = await sharp(imageBuffer).metadata();
          const imgWidth = metadata.width || img.width;
          const imgHeight = metadata.height || img.height;

          console.log(`[ExportGenerator] Image dimensions: ${imgWidth}x${imgHeight}`);

          // Create SVG overlay with annotations
          const svgOverlay = this.createAnnotationSvg(
            img.annotations,
            imgWidth,
            imgHeight,
            colorMap,
            defaultColors
          );

          // Convert SVG to PNG buffer for compositing (sharp needs this for proper overlay)
          const svgBuffer = await sharp(Buffer.from(svgOverlay), { density: 72 })
            .resize(imgWidth, imgHeight)
            .png()
            .toBuffer();

          // Composite the annotation overlay onto the image
          let outputBuffer: Buffer;

          if (outputFormat === 'png') {
            outputBuffer = await sharp(imageBuffer)
              .composite([
                {
                  input: svgBuffer,
                  top: 0,
                  left: 0,
                },
              ])
              .png({ compressionLevel: 6 })
              .toBuffer();
          } else {
            outputBuffer = await sharp(imageBuffer)
              .composite([
                {
                  input: svgBuffer,
                  top: 0,
                  left: 0,
                },
              ])
              .jpeg({ quality: 92, mozjpeg: true })
              .toBuffer();
          }

          // Get filename with new extension
          const baseName = img.fileName.replace(/\.[^.]+$/, '');
          const newFileName = `${baseName}_labeled.${outputFormat}`;

          archive.append(outputBuffer, { name: `labeled_images/${newFileName}` });

          processedCount++;
          if (progressCallback && processedCount % 5 === 0) {
            const progress = Math.round((processedCount / totalImages) * 90);
            await progressCallback(progress);
          }
        } catch (error) {
          console.error(`[ExportGenerator] Failed to process image ${img.fileName}:`, error);
        }
      }

      // Add a manifest file with image info
      const manifest = this.generateLabeledImagesManifest(images, labelClasses, outputFormat);
      archive.append(manifest, { name: 'manifest.json' });

      // Add README
      archive.append(
        this.generateLabeledReadme(outputFormat, images.length, labelClasses.length),
        { name: 'README.txt' }
      );

      archive.finalize();
    });
  }

  private createAnnotationSvg(
    annotations: AnnotationData[],
    width: number,
    height: number,
    colorMap: Map<string, string>,
    defaultColors: string[]
  ): string {
    console.log(`[ExportGenerator] Creating SVG for ${annotations.length} annotations, size: ${width}x${height}`);
    
    let colorIndex = 0;
    const elements: string[] = [];

    for (const ann of annotations) {
      let color = colorMap.get(ann.labelClass.id);
      if (!color) {
        color = defaultColors[colorIndex % defaultColors.length];
        colorIndex++;
      }

      const x = Math.round(ann.x);
      const y = Math.round(ann.y);
      const w = Math.round(ann.width);
      const h = Math.round(ann.height);

      console.log(`[ExportGenerator] Annotation: ${ann.labelClass.name} at (${x},${y}) ${w}x${h} color=${color}`);

      // Draw bounding box with stroke
      elements.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
        `fill="none" stroke="${color}" stroke-width="3" />`
      );

      // Draw semi-transparent fill
      elements.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
        `fill="${color}" fill-opacity="0.15" />`
      );

      // Draw label background
      const labelText = ann.labelClass.name;
      const fontSize = Math.max(12, Math.min(16, Math.round(height / 40)));
      const labelPadding = 4;
      const labelWidth = labelText.length * fontSize * 0.6 + labelPadding * 2;
      const labelHeight = fontSize + labelPadding * 2;
      const labelY = Math.max(0, y - labelHeight);

      elements.push(
        `<rect x="${x}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" ` +
        `fill="${color}" rx="2" />`
      );

      // Draw label text
      elements.push(
        `<text x="${x + labelPadding}" y="${labelY + fontSize + labelPadding / 2}" ` +
        `font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">` +
        `${this.escapeXml(labelText)}</text>`
      );
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${elements.join('')}</svg>`;
  }

  private generateLabeledImagesManifest(
    images: ImageData[],
    labelClasses: { id: string; name: string; colorHex: string }[],
    format: string
  ): string {
    const manifest = {
      exportType: `labeled_${format}`,
      exportedAt: new Date().toISOString(),
      totalImages: images.length,
      labelClasses: labelClasses.map((lc) => ({
        name: lc.name,
        color: lc.colorHex,
      })),
      images: images.map((img) => ({
        originalName: img.fileName,
        labeledName: `${img.fileName.replace(/\.[^.]+$/, '')}_labeled.${format}`,
        width: img.width,
        height: img.height,
        annotationCount: img.annotations.length,
        annotations: img.annotations.map((ann) => ({
          label: ann.labelClass.name,
          bbox: { x: ann.x, y: ann.y, width: ann.width, height: ann.height },
        })),
      })),
    };

    return JSON.stringify(manifest, null, 2);
  }

  private generateLabeledReadme(format: string, imageCount: number, classCount: number): string {
    return `
Imagenix Labeled Images Export
==============================

Format: ${format.toUpperCase()} with annotations drawn
Images: ${imageCount}
Classes: ${classCount}
Exported: ${new Date().toISOString()}

This export contains images with bounding box annotations drawn directly on them.
Each image has:
- Colored bounding boxes around detected objects
- Labels showing the class name above each box
- Semi-transparent fill for visibility

Files:
- labeled_images/ - Contains all labeled images
- manifest.json - Metadata about images and annotations
- README.txt - This file

Best used for:
- Visual inspection of annotations
- Documentation and presentations
- Quick review of labeling quality

For model training, use COCO, YOLO, or VOC format exports instead.

For more information, visit https://imagenix.ai
`.trim();
  }

  private generateCOCO(
    images: ImageData[],
    labelClasses: { id: string; name: string }[]
  ): Record<string, string> {
    // Build category mapping
    const categories = labelClasses.map((lc, index) => ({
      id: index + 1,
      name: lc.name,
      supercategory: 'object',
    }));

    const categoryIdMap = new Map(labelClasses.map((lc, index) => [lc.id, index + 1]));

    // Build images and annotations
    const cocoImages: unknown[] = [];
    const cocoAnnotations: unknown[] = [];
    let annotationId = 1;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imageId = i + 1;

      cocoImages.push({
        id: imageId,
        file_name: img.fileName,
        width: img.width,
        height: img.height,
      });

      for (const ann of img.annotations) {
        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId,
          category_id: categoryIdMap.get(ann.labelClass.id) || 1,
          bbox: [ann.x, ann.y, ann.width, ann.height],
          area: ann.width * ann.height,
          iscrowd: 0,
        });
      }
    }

    const cocoFormat = {
      info: {
        description: 'Imagenix Dataset Export',
        version: '1.0',
        year: new Date().getFullYear(),
        contributor: 'Imagenix',
        date_created: new Date().toISOString(),
      },
      licenses: [
        {
          id: 1,
          name: 'Unknown',
          url: '',
        },
      ],
      images: cocoImages,
      annotations: cocoAnnotations,
      categories,
    };

    return {
      'annotations/instances.json': JSON.stringify(cocoFormat, null, 2),
    };
  }

  private generateYOLO(
    images: ImageData[],
    labelClasses: { id: string; name: string }[]
  ): Record<string, string> {
    const files: Record<string, string> = {};

    // Build class index mapping
    const classIndexMap = new Map(labelClasses.map((lc, index) => [lc.id, index]));

    // Generate classes.txt
    files['classes.txt'] = labelClasses.map((lc) => lc.name).join('\n');

    // Generate label files for each image
    for (const img of images) {
      const labelLines: string[] = [];

      for (const ann of img.annotations) {
        const classIndex = classIndexMap.get(ann.labelClass.id) ?? 0;

        // Convert to YOLO format (normalized center x, center y, width, height)
        const centerX = (ann.x + ann.width / 2) / img.width;
        const centerY = (ann.y + ann.height / 2) / img.height;
        const normWidth = ann.width / img.width;
        const normHeight = ann.height / img.height;

        labelLines.push(
          `${classIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${normWidth.toFixed(6)} ${normHeight.toFixed(6)}`
        );
      }

      // Get filename without extension
      const baseName = img.fileName.replace(/\.[^.]+$/, '');
      files[`labels/${baseName}.txt`] = labelLines.join('\n');
    }

    // Generate data.yaml for YOLOv5/v8
    const dataYaml = `
# Imagenix Dataset Export
# YOLO Format

path: ./
train: images/train
val: images/val

nc: ${labelClasses.length}
names: [${labelClasses.map((lc) => `'${lc.name}'`).join(', ')}]
`.trim();

    files['data.yaml'] = dataYaml;

    return files;
  }

  private generateVOC(images: ImageData[]): Record<string, string> {
    const files: Record<string, string> = {};

    for (const img of images) {
      const objects = img.annotations
        .map(
          (ann) => `
    <object>
        <name>${this.escapeXml(ann.labelClass.name)}</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <bndbox>
            <xmin>${ann.x}</xmin>
            <ymin>${ann.y}</ymin>
            <xmax>${ann.x + ann.width}</xmax>
            <ymax>${ann.y + ann.height}</ymax>
        </bndbox>
    </object>`
        )
        .join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
    <folder>images</folder>
    <filename>${this.escapeXml(img.fileName)}</filename>
    <source>
        <database>Imagenix</database>
    </source>
    <size>
        <width>${img.width}</width>
        <height>${img.height}</height>
        <depth>3</depth>
    </size>
    <segmented>0</segmented>
${objects}
</annotation>`;

      const baseName = img.fileName.replace(/\.[^.]+$/, '');
      files[`Annotations/${baseName}.xml`] = xml;
    }

    // Generate ImageSets
    const trainList = images.map((img) => img.fileName.replace(/\.[^.]+$/, '')).join('\n');
    files['ImageSets/Main/train.txt'] = trainList;
    files['ImageSets/Main/trainval.txt'] = trainList;

    return files;
  }

  private generateReadme(format: string, imageCount: number, classCount: number): string {
    return `
Imagenix Dataset Export
=======================

Format: ${format.toUpperCase()}
Images: ${imageCount}
Classes: ${classCount}
Exported: ${new Date().toISOString()}

For more information, visit https://imagenix.ai
`.trim();
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
