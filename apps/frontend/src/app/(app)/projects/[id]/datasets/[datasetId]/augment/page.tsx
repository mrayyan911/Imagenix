'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  datasetsApi,
  imagesApi,
  jobsApi,
  augmentationApi,
  type Dataset,
  type Image,
  type AugmentationCapabilities,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Wand2,
  RotateCcw,
  Sparkles,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Palette,
  Haze,
  Crop,
  ZoomIn,
  AlertCircle,
  CheckCircle,
  Play,
  Eye,
} from 'lucide-react';

interface Transform {
  type: string;
  value?: number;
  enabled: boolean;
}

export default function AugmentationStudioPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const datasetId = params.datasetId as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [capabilities, setCapabilities] = useState<AugmentationCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobLabel, setJobLabel] = useState('');
  const [jobStartTime, setJobStartTime] = useState<number | null>(null);

  // Classical augmentation settings
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  // Preview state
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    preview: string;
    validAnnotationCount: number;
    invalidAnnotationCount: number;
  } | null>(null);

  // Generative settings
  const [generativeVariation, setGenerativeVariation] = useState('weather');
  const [generativePrompt, setGenerativePrompt] = useState('');
  const [generativeQuantity, setGenerativeQuantity] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [datasetRes, imagesRes, capabilitiesRes] = await Promise.all([
        datasetsApi.get(datasetId),
        imagesApi.list(datasetId, { page: 1, pageSize: 100 }),
        augmentationApi.getCapabilities(),
      ]);

      setDataset(datasetRes.data.data?.dataset || null);
      setImages(imagesRes.data.data?.items || []);

      const caps = capabilitiesRes.data.data;
      setCapabilities(caps || null);

      // Initialize transforms from capabilities
      if (caps?.classical.transforms) {
        setTransforms(
          caps.classical.transforms.map((t) => ({
            type: t.type,
            value: t.valueRange?.default,
            enabled: false,
          }))
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load augmentation studio',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [datasetId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTransformIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      flip_horizontal: <FlipHorizontal className="h-4 w-4" />,
      flip_vertical: <FlipVertical className="h-4 w-4" />,
      rotate: <RotateCcw className="h-4 w-4" />,
      brightness: <Sun className="h-4 w-4" />,
      contrast: <Contrast className="h-4 w-4" />,
      saturation: <Palette className="h-4 w-4" />,
      blur: <Haze className="h-4 w-4" />,
      noise: <Sparkles className="h-4 w-4" />,
      scale: <ZoomIn className="h-4 w-4" />,
      crop: <Crop className="h-4 w-4" />,
    };
    return icons[type] || <Wand2 className="h-4 w-4" />;
  };

  const toggleTransform = (index: number) => {
    setTransforms((prev) =>
      prev.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t))
    );
    setPreviewData(null); // Clear preview when settings change
  };

  const updateTransformValue = (index: number, value: number) => {
    setTransforms((prev) =>
      prev.map((t, i) => (i === index ? { ...t, value } : t))
    );
    setPreviewData(null);
  };

  const getEnabledTransforms = () =>
    transforms
      .filter((t) => t.enabled)
      .map((t) => ({ type: t.type, value: t.value }));

  const handlePreview = async () => {
    const enabledTransforms = getEnabledTransforms();
    if (enabledTransforms.length === 0) {
      toast({
        title: 'No transforms selected',
        description: 'Please enable at least one augmentation',
        variant: 'destructive',
      });
      return;
    }

    const imageId = previewImageId || images[0]?.id;
    if (!imageId) {
      toast({
        title: 'No images',
        description: 'Please upload images first',
        variant: 'destructive',
      });
      return;
    }

    setIsPreviewing(true);
    try {
      const response = await augmentationApi.preview(imageId, enabledTransforms);
      setPreviewData(response.data.data || null);
    } catch (error: any) {
      toast({
        title: 'Preview failed',
        description: error.response?.data?.error?.message || 'Failed to generate preview',
        variant: 'destructive',
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleRunClassical = async () => {
    const enabledTransforms = getEnabledTransforms();
    if (enabledTransforms.length === 0) {
      toast({
        title: 'No transforms selected',
        description: 'Please enable at least one augmentation',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setJobProgress(0);
    setJobStartTime(Date.now());
    const imgCount = selectedImageIds.length > 0 ? selectedImageIds.length : images.length;
    setJobLabel(`0 of ${imgCount * multiplier} images generated`);
    try {
      const response = await augmentationApi.createClassical(datasetId, {
        transforms: enabledTransforms,
        multiplier,
        imageIds: selectedImageIds.length > 0 ? selectedImageIds : undefined,
      });

      toast({
        title: 'Augmentation started',
        description: 'Processing images in background...',
      });

      const jobId = response.data.data?.jobId;
      if (jobId) {
        pollJobStatus(jobId, imgCount * multiplier, 'generated');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to start augmentation',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setJobStartTime(null);
    }
  };

  const handleRunGenerative = async () => {
    setIsProcessing(true);
    setJobProgress(0);
    setJobStartTime(Date.now());
    const imgCount = selectedImageIds.length > 0 ? selectedImageIds.length : images.length;
    const total = imgCount * generativeQuantity;
    setJobLabel(`0 of ${total} images generated`);
    try {
      const response = await augmentationApi.createGenerative(datasetId, {
        variationType: generativeVariation,
        prompt: generativePrompt || undefined,
        quantity: generativeQuantity,
        imageIds: selectedImageIds.length > 0 ? selectedImageIds : undefined,
      });

      toast({
        title: 'Generative augmentation started',
        description: `Estimated cost: $${response.data.data?.estimate.estimatedUSD.toFixed(2)}`,
      });

      const jobId = response.data.data?.jobId;
      if (jobId) {
        pollJobStatus(jobId, total, 'generated');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to start generative augmentation',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setJobStartTime(null);
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

  const pollJobStatus = async (jobId: string, totalImages: number, verb: string) => {
    const poll = async () => {
      try {
        const response = await jobsApi.getStatus(jobId);
        const job = response.data.data;

        if (job?.progress != null) {
          setJobProgress(job.progress);
          const done = Math.round((job.progress / 100) * totalImages);
          setJobLabel(`${done} of ${totalImages} images ${verb}`);
        }

        if (job?.status === 'succeeded') {
          setJobProgress(100);
          setJobLabel(`${totalImages} of ${totalImages} images ${verb}`);
          toast({
            title: 'Augmentation complete',
            description: 'New images have been created.',
            variant: 'success',
          });
          setTimeout(() => {
            setIsProcessing(false);
            setJobProgress(0);
            setJobStartTime(null);
            setJobLabel('');
          }, 2000);
          loadData();
        } else if (job?.status === 'failed') {
          toast({
            title: 'Augmentation failed',
            description: job.errorMessage || 'Unknown error',
            variant: 'destructive',
          });
          setIsProcessing(false);
          setJobProgress(0);
          setJobStartTime(null);
          setJobLabel('');
        } else if (job?.status === 'running' || job?.status === 'queued') {
          setTimeout(poll, 2000);
        }
      } catch {
        setTimeout(poll, 3000);
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

  const enabledCount = transforms.filter((t) => t.enabled).length;
  const estimatedOutputImages = images.length * multiplier;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/projects/${projectId}/datasets/${datasetId}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dataset
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Augmentation Studio</h1>
            <p className="text-neutral-500 mt-1">
              {dataset?.name} · {images.length} images
            </p>
          </div>
        </div>

        {/* Image Selection */}
        {(() => {
          const sourceImages = images.filter((img) => !img.isSynthetic);
          return sourceImages.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select Images</CardTitle>
                  <CardDescription>
                    Choose which source images to augment. Leave unselected to augment all.
                    {images.length !== sourceImages.length && (
                      <span className="text-neutral-400 ml-1">
                        ({images.length - sourceImages.length} synthetic images hidden)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">
                    {selectedImageIds.length === 0
                      ? `All ${sourceImages.length} source images`
                      : `${selectedImageIds.length} of ${sourceImages.length} selected`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedImageIds.length === sourceImages.length) {
                        setSelectedImageIds([]);
                      } else {
                        setSelectedImageIds(sourceImages.map((img) => img.id));
                      }
                    }}
                  >
                    {selectedImageIds.length === sourceImages.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto">
                {sourceImages.map((img) => {
                  const isSelected = selectedImageIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      onClick={() => {
                        setSelectedImageIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== img.id)
                            : [...prev, img.id]
                        );
                      }}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-primary-500 ring-2 ring-primary-200'
                          : 'border-transparent hover:border-neutral-300'
                      }`}
                    >
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={img.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                          <span className="text-xs text-neutral-400 truncate px-1">{img.fileName}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                          <CheckCircle className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          ) : null;
        })()}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Classical Augmentation */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Classical Augmentation
                </CardTitle>
                <CardDescription>
                  Apply transformation-based augmentations to increase dataset diversity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!capabilities?.classical.enabled ? (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm">
                      Classical augmentation is disabled. Set FEATURE_AUGMENTATION=true in .env
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Transform Grid */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      {capabilities.classical.transforms.map((transform, index) => (
                        <div
                          key={transform.type}
                          className={`p-4 rounded-lg border transition-colors ${
                            transforms[index]?.enabled
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getTransformIcon(transform.type)}
                              <span className="font-medium">{transform.name}</span>
                            </div>
                            <Switch
                              checked={transforms[index]?.enabled || false}
                              onCheckedChange={() => toggleTransform(index)}
                            />
                          </div>
                          {transform.requiresValue && transforms[index]?.enabled && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Value</span>
                                <span className="font-mono">
                                  {transforms[index]?.value?.toFixed(1)}
                                </span>
                              </div>
                              <Slider
                                value={[transforms[index]?.value || transform.valueRange!.default]}
                                min={transform.valueRange!.min}
                                max={transform.valueRange!.max}
                                step={0.1}
                                onValueChange={([v]) => updateTransformValue(index, v)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Multiplier */}
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-medium">Copies per Image</label>
                        <span className="text-sm text-neutral-500">
                          Will create {estimatedOutputImages} new images
                        </span>
                      </div>
                      <Slider
                        value={[multiplier]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={([v]) => setMultiplier(v)}
                      />
                      <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>1</span>
                        <span>10</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handlePreview}
                        disabled={enabledCount === 0 || isPreviewing || images.length === 0}
                      >
                        {isPreviewing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        Preview
                      </Button>
                      <Button
                        onClick={handleRunClassical}
                        disabled={enabledCount === 0 || isProcessing || images.length === 0}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Run Augmentation ({enabledCount} transforms)
                      </Button>
                    </div>

                    {/* Progress bar for classical augmentation */}
                    {isProcessing && jobProgress >= 0 && (
                      <Progress
                        value={jobProgress}
                        label={jobLabel}
                        estimatedTime={getEstimatedTime(jobProgress, jobStartTime)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generative Augmentation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generative Augmentation
                </CardTitle>
                <CardDescription>
                  AI-generated variations using Stable Diffusion, DALL-E, or other models
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!capabilities?.generative.enabled ? (
                  <div className="flex items-center gap-3 p-4 bg-neutral-100 text-neutral-600 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Generative augmentation is disabled</p>
                      <p className="text-xs mt-1">
                        Set FEATURE_GENERATIVE_AUGMENTATION=true and configure GENERATIVE_PROVIDER
                      </p>
                    </div>
                  </div>
                ) : !capabilities?.generative.available ? (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">No provider configured</p>
                      <p className="text-xs mt-1">
                        Configure GENERATIVE_PROVIDER (openai, stability, replicate, local) and API key
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Variation Type</label>
                      <select
                        className="mt-1 w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm"
                        value={generativeVariation}
                        onChange={(e) => setGenerativeVariation(e.target.value)}
                      >
                        {capabilities.generative.variations.map((v) => (
                          <option key={v} value={v}>
                            {v.charAt(0).toUpperCase() + v.slice(1).replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Custom Prompt (optional)</label>
                      <Input
                        className="mt-1"
                        placeholder="e.g., rainy weather, night time"
                        value={generativePrompt}
                        onChange={(e) => setGenerativePrompt(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Generations per Image: {generativeQuantity}
                      </label>
                      <Slider
                        className="mt-2"
                        value={[generativeQuantity]}
                        min={1}
                        max={5}
                        step={1}
                        onValueChange={([v]) => setGenerativeQuantity(v)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleRunGenerative}
                      disabled={isProcessing || images.length === 0}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate Variations
                    </Button>

                    {/* Progress bar for generative augmentation */}
                    {isProcessing && jobProgress >= 0 && (
                      <Progress
                        value={jobProgress}
                        label={jobLabel}
                        estimatedTime={getEstimatedTime(jobProgress, jobStartTime)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  See how augmentation affects your images
                </CardDescription>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <div className="aspect-square bg-neutral-100 rounded-lg flex items-center justify-center">
                    <p className="text-neutral-400 text-sm">No images uploaded</p>
                  </div>
                ) : (
                  <>
                    {/* Original Image Selector */}
                    <div className="mb-4">
                      <label className="text-sm font-medium">Select Image</label>
                      <select
                        className="mt-1 w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm"
                        value={previewImageId || images[0]?.id}
                        onChange={(e) => {
                          setPreviewImageId(e.target.value);
                          setPreviewData(null);
                        }}
                      >
                        {images.map((img) => (
                          <option key={img.id} value={img.id}>
                            {img.fileName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Preview Image */}
                    <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden relative">
                      {previewData ? (
                        <img
                          src={`data:image/jpeg;base64,${previewData.preview}`}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : isPreviewing ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                          <div className="text-center">
                            <Eye className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">Click Preview to see results</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Annotation Status */}
                    {previewData && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{previewData.validAnnotationCount} valid annotations</span>
                        </div>
                        {previewData.invalidAnnotationCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              {previewData.invalidAnnotationCount} annotations out of bounds
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Source Images</span>
                  <span className="font-medium">{images.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Active Transforms</span>
                  <span className="font-medium">{enabledCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Multiplier</span>
                  <span className="font-medium">×{multiplier}</span>
                </div>
                <hr />
                <div className="flex justify-between text-sm font-medium">
                  <span>Output Images</span>
                  <span className="text-primary-600">{estimatedOutputImages}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
