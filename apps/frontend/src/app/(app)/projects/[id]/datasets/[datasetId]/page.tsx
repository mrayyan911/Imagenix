'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  datasetsApi,
  imagesApi,
  jobsApi,
  exportsApi,
  labelClassesApi,
  type Dataset,
  type Image,
  type LabelClass,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wand2,
} from 'lucide-react';

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const datasetId = params.datasetId as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [labelClasses, setLabelClasses] = useState<LabelClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoAnnotateClass, setAutoAnnotateClass] = useState('');
  const [isAutoAnnotating, setIsAutoAnnotating] = useState(false);
  const [exportFormat, setExportFormat] = useState('coco');
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [datasetRes, imagesRes] = await Promise.all([
        datasetsApi.get(datasetId),
        imagesApi.list(datasetId, { page: 1, pageSize: 100 }),
      ]);

      setDataset(datasetRes.data.data?.dataset || null);
      setLabelClasses(datasetRes.data.data?.labelClasses || []);
      setImages(imagesRes.data.data?.items || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dataset',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [datasetId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uploadFile = async (file: File) => {
    // Get upload URL
    const uploadUrlRes = await imagesApi.getUploadUrl(datasetId, {
      fileName: file.name,
      mimeType: file.type,
    });

    const { uploadUrl, fileKey } = uploadUrlRes.data.data!;

    // Upload to S3/MinIO
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    // Get image dimensions
    const dimensions = await getImageDimensions(file);

    // Calculate SHA256
    const sha256 = await calculateSHA256(file);

    // Commit image
    await imagesApi.commit(datasetId, {
      fileKey,
      fileName: file.name,
      mimeType: file.type,
      width: dimensions.width,
      height: dimensions.height,
      sha256,
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        for (let i = 0; i < acceptedFiles.length; i++) {
          await uploadFile(acceptedFiles[i]);
          setUploadProgress(Math.round(((i + 1) / acceptedFiles.length) * 100));
        }

        toast({
          title: 'Upload complete',
          description: `${acceptedFiles.length} images uploaded successfully.`,
          variant: 'success',
        });

        // Reload data
        loadData();
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.message || 'Failed to upload images',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [datasetId, toast, loadData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const handleAutoAnnotate = async () => {
    if (!autoAnnotateClass.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a class name',
        variant: 'destructive',
      });
      return;
    }

    setIsAutoAnnotating(true);
    try {
      const response = await jobsApi.createAutoAnnotation(datasetId, {
        className: autoAnnotateClass,
        confidenceThreshold: 0.35,
      });

      toast({
        title: 'Auto-annotation started',
        description: 'Processing images in background...',
      });

      // Poll for job completion
      const jobId = response.data.data?.jobId;
      if (jobId) {
        pollJobStatus(jobId);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start auto-annotation',
        variant: 'destructive',
      });
    } finally {
      setIsAutoAnnotating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      const response = await jobsApi.getStatus(jobId);
      const job = response.data.data;

      if (job?.status === 'succeeded') {
        toast({
          title: 'Auto-annotation complete',
          description: 'Images have been annotated.',
          variant: 'success',
        });
        loadData();
      } else if (job?.status === 'failed') {
        toast({
          title: 'Auto-annotation failed',
          description: job.errorMessage || 'Unknown error',
          variant: 'destructive',
        });
      } else if (job?.status === 'running' || job?.status === 'queued') {
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportsApi.create(datasetId, { format: exportFormat });
      const jobId = response.data.data?.jobId;

      toast({
        title: 'Export started',
        description: 'Generating export file...',
      });

      // Poll for completion
      if (jobId) {
        pollExportStatus(jobId);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start export',
        variant: 'destructive',
      });
      setIsExporting(false);
    }
  };

  const pollExportStatus = async (jobId: string) => {
    const poll = async () => {
      const response = await jobsApi.getStatus(jobId);
      const job = response.data.data;

      if (job?.status === 'succeeded') {
        // Get download URL - export ID is same as job ID for simplicity
        try {
          const exportRes = await exportsApi.list(datasetId);
          const latestExport = exportRes.data.data?.exports[0];
          if (latestExport) {
            const downloadRes = await exportsApi.getDownload(latestExport.id);
            window.open(downloadRes.data.data?.downloadUrl, '_blank');
          }
        } catch (e) {
          console.error('Failed to get download URL:', e);
        }
        toast({
          title: 'Export ready',
          description: 'Your download should start automatically.',
          variant: 'success',
        });
        setIsExporting(false);
      } else if (job?.status === 'failed') {
        toast({
          title: 'Export failed',
          description: job.errorMessage || 'Unknown error',
          variant: 'destructive',
        });
        setIsExporting(false);
      } else {
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{dataset?.name}</h1>
            <p className="text-neutral-500 mt-1">
              {images.length} images · {dataset?.annotationCount || 0} annotations
            </p>
          </div>
          <Link href={`/projects/${projectId}/datasets/${datasetId}/augment`}>
            <Button variant="outline">
              <Wand2 className="h-4 w-4 mr-2" />
              Augmentation Studio
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload Area */}
            <Card>
              <CardContent className="pt-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-300 hover:border-primary-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  {isUploading ? (
                    <div>
                      <Loader2 className="h-12 w-12 mx-auto text-primary-500 animate-spin mb-4" />
                      <p className="text-neutral-600">Uploading... {uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                      <p className="text-neutral-600">
                        Drag & drop images here, or click to select
                      </p>
                      <p className="text-sm text-neutral-400 mt-2">
                        Supports JPG, PNG up to 20MB
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Images Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500">No images yet. Upload some to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {images.map((image) => (
                      <Link
                        key={image.id}
                        href={`/projects/${projectId}/datasets/${datasetId}/annotate/${image.id}`}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-neutral-200 hover:border-primary-400 transition-colors"
                      >
                        {image.url ? (
                          <img
                            src={image.url}
                            alt={image.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-neutral-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <div className="flex items-center justify-between text-white text-xs">
                            <span className="truncate">{image.fileName}</span>
                            {(image.annotationCount || 0) > 0 && (
                              <span className="bg-primary-500 px-1.5 py-0.5 rounded">
                                {image.annotationCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Auto Annotate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Auto Annotate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    placeholder="Class name (e.g., person)"
                    value={autoAnnotateClass}
                    onChange={(e) => setAutoAnnotateClass(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAutoAnnotate}
                  disabled={isAutoAnnotating || images.length === 0}
                >
                  {isAutoAnnotating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Run Auto-Annotation
                </Button>
                <p className="text-xs text-neutral-500">
                  AI will detect objects matching the class name and create draft annotations.
                </p>
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Dataset
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  <option value="coco">COCO Format</option>
                  <option value="yolo">YOLO Format</option>
                  <option value="voc">Pascal VOC Format</option>
                </select>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleExport}
                  disabled={isExporting || images.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = URL.createObjectURL(file);
  });
}

async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
