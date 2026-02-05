import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import * as archiver from 'archiver';
import { Readable } from 'stream';

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
    format: 'coco' | 'yolo' | 'voc',
    includeImages: boolean,
    annotationStatus: string[]
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
