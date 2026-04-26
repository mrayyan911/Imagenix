'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  LabelClassesManager,
  type LabelClassesManagerRef,
} from '@/components/label-classes-manager';
import {
  datasetsApi,
  imagesApi,
  jobsApi,
  exportsApi,
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
  Wand2,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { useDatasetStore } from '@/stores/dataset-store';

export default function DatasetDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const projectId = params.id as string;
  const datasetId = params.datasetId as string;

  const labelClassesManagerRef = useRef<LabelClassesManagerRef>(null);

  // Use global store for selected images and job state (persists across navigation)
  const { getSelectedImages, toggleImage, selectAll, deselectAll, getJob, startJob, startPolling } =
    useDatasetStore();

  const selectedImageIds = getSelectedImages(datasetId);
  const activeJob = getJob(datasetId);

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [_labelClasses, setLabelClasses] = useState<LabelClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoAnnotateClass, setAutoAnnotateClass] = useState('');
  const [exportFormat, setExportFormat] = useState('coco');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingImages, setIsDeletingImages] = useState(false);
  const [showDeleteImagesConfirm, setShowDeleteImagesConfirm] = useState(false);

  // Derived state from active job
  const isAutoAnnotating =
    activeJob?.jobType === 'auto-annotation' &&
    (activeJob.status === 'queued' || activeJob.status === 'running');
  const annotationProgress = activeJob?.progress || 0;
  const annotationImagesTotal = activeJob?.totalImages || 0;
  const annotationStartTime = activeJob?.startTime || null;

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

  // Resume polling if there's an active job (e.g., user navigated away and came back)
  useEffect(() => {
    if (activeJob?.jobId && (activeJob.status === 'queued' || activeJob.status === 'running')) {
      startPolling(datasetId, activeJob.jobId, () => {
        toast({
          title: 'Auto-annotation complete',
          description: 'Images have been annotated.',
          variant: 'success',
        });
        loadData();
        labelClassesManagerRef.current?.refresh();
      });
    }
  }, [datasetId]); // Only run on mount/datasetId change

  // Show toast when job fails
  useEffect(() => {
    if (activeJob?.status === 'failed') {
      toast({
        title: 'Auto-annotation failed',
        description: activeJob.errorMessage || 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [activeJob?.status, activeJob?.errorMessage, toast]);

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

  const toggleImageSelection = (imageId: string) => {
    toggleImage(datasetId, imageId);
  };

  const toggleSelectAll = () => {
    if (selectedImageIds.size === images.length) {
      deselectAll(datasetId);
    } else {
      selectAll(
        datasetId,
        images.map((img) => img.id)
      );
    }
  };

  const handleDeleteSelectedImages = async () => {
    if (selectedImageIds.size === 0) {
      return;
    }

    setIsDeletingImages(true);
    try {
      const response = await imagesApi.bulkDelete(datasetId, Array.from(selectedImageIds));
      const deleted = response.data.data?.deleted || 0;

      toast({
        title: 'Success',
        description: `Deleted ${deleted} image${deleted !== 1 ? 's' : ''}`,
        variant: 'success',
      });

      deselectAll(datasetId);
      setShowDeleteImagesConfirm(false);
      await loadData();
      labelClassesManagerRef.current?.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to delete images',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingImages(false);
    }
  };

  const handleAutoAnnotate = async () => {
    if (!autoAnnotateClass.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a class name',
        variant: 'destructive',
      });
      return;
    }

    if (selectedImageIds.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one image to annotate',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await jobsApi.createAutoAnnotation(datasetId, {
        className: autoAnnotateClass,
        confidenceThreshold: 0.35,
        imageIds: Array.from(selectedImageIds),
      });

      toast({
        title: 'Auto-annotation started',
        description: `Processing ${selectedImageIds.size} images...`,
      });

      const jobId = response.data.data?.jobId;
      if (jobId) {
        // Start job in global store (persists across navigation)
        startJob(datasetId, jobId, 'auto-annotation', selectedImageIds.size);
        startPolling(datasetId, jobId, () => {
          toast({
            title: 'Auto-annotation complete',
            description: 'Images have been annotated.',
            variant: 'success',
          });
          loadData();
          labelClassesManagerRef.current?.refresh();
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start auto-annotation',
        variant: 'destructive',
      });
    }
  };

  const getEstimatedTime = (progress: number, startTime: number | null): string | undefined => {
    if (!startTime || progress <= 0 || progress >= 100) return undefined;
    const elapsed = (Date.now() - startTime) / 1000;
    const total = elapsed / (progress / 100);
    const remaining = Math.max(0, Math.ceil(total - elapsed));
    if (remaining < 60) return `~${remaining}s remaining`;
    return `~${Math.ceil(remaining / 60)}min remaining`;
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
                      <p className="text-sm text-neutral-400 mt-2">Supports JPG, PNG up to 20MB</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Images Grid */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Images</CardTitle>
                  {images.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500">
                        {selectedImageIds.size} of {images.length} selected
                      </span>
                      {selectedImageIds.size > 0 && (
                        <>
                          {!showDeleteImagesConfirm ? (
                            <button
                              type="button"
                              onClick={() => setShowDeleteImagesConfirm(true)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-red-600">
                                Delete {selectedImageIds.size}?
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowDeleteImagesConfirm(false)}
                                className="text-sm text-neutral-600 hover:text-neutral-800 font-medium"
                                disabled={isDeletingImages}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteSelectedImages}
                                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                                disabled={isDeletingImages}
                              >
                                {isDeletingImages ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Confirm
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                      >
                        {selectedImageIds.size === images.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500">No images yet. Upload some to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {images.map((image) => {
                      const isSelected = selectedImageIds.has(image.id);
                      return (
                        <div
                          key={image.id}
                          className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-primary-500 ring-2 ring-primary-200'
                              : 'border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          <Link
                            href={`/projects/${projectId}/datasets/${datasetId}/annotate/${image.id}`}
                            className="block w-full h-full"
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
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </Link>

                          {/* Selection checkbox — top-left corner */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleImageSelection(image.id);
                            }}
                            className="absolute top-1.5 left-1.5 z-10 p-0.5 rounded bg-black/30 hover:bg-black/50 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary-400 drop-shadow" />
                            ) : (
                              <Square className="h-5 w-5 text-white/80 drop-shadow" />
                            )}
                          </button>

                          {/* Bottom info bar */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                            <div className="flex items-center justify-between text-white text-xs">
                              <span className="truncate">{image.fileName}</span>
                              {(image.annotationCount || 0) > 0 && (
                                <span className="bg-primary-500 px-1.5 py-0.5 rounded">
                                  {image.annotationCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                    placeholder="Class name (e.g., car, person)"
                    value={autoAnnotateClass}
                    onChange={(e) => setAutoAnnotateClass(e.target.value)}
                  />
                </div>

                {selectedImageIds.size > 0 && !isAutoAnnotating && (
                  <p className="text-sm text-primary-600 font-medium">
                    {selectedImageIds.size} image{selectedImageIds.size > 1 ? 's' : ''} selected
                  </p>
                )}

                {/* Progress bar — visible while job is running */}
                {isAutoAnnotating && (
                  <Progress
                    value={annotationProgress}
                    label={(() => {
                      const done = Math.round((annotationProgress / 100) * annotationImagesTotal);
                      return `${done} of ${annotationImagesTotal} images annotated`;
                    })()}
                    estimatedTime={getEstimatedTime(annotationProgress, annotationStartTime)}
                  />
                )}

                <Button
                  className="w-full"
                  onClick={handleAutoAnnotate}
                  disabled={isAutoAnnotating || selectedImageIds.size === 0}
                >
                  {isAutoAnnotating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {isAutoAnnotating
                    ? 'Annotating...'
                    : selectedImageIds.size > 0
                      ? `Annotate ${selectedImageIds.size} Image${selectedImageIds.size > 1 ? 's' : ''}`
                      : 'Select Images to Annotate'}
                </Button>
                {!isAutoAnnotating && (
                  <p className="text-xs text-neutral-500">
                    Select images from the grid, enter a class name, and run AI detection.
                  </p>
                )}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Format</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <optgroup label="For Model Training">
                      <option value="coco">COCO Format</option>
                      <option value="yolo">YOLO Format</option>
                      <option value="voc">Pascal VOC Format</option>
                    </optgroup>
                    <optgroup label="Labeled Images (Visual)">
                      <option value="labeled_jpg">JPG with Labels (Smaller)</option>
                      <option value="labeled_png">PNG with Labels (Lossless)</option>
                    </optgroup>
                  </select>
                  {(exportFormat === 'labeled_jpg' || exportFormat === 'labeled_png') && (
                    <p className="text-xs text-neutral-500">
                      Downloads a ZIP with images that have bounding boxes and labels drawn on them.
                      Best for visual review, not model training.
                    </p>
                  )}
                </div>
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
                  {exportFormat.startsWith('labeled_') ? 'Download Labeled Images' : 'Export'}
                </Button>
              </CardContent>
            </Card>

            {/* Label Classes Manager */}
            <LabelClassesManager
              ref={labelClassesManagerRef}
              projectId={projectId}
              selectedImageIds={selectedImageIds}
              onAnnotationsDeleted={loadData}
            />
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
