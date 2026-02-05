'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  imagesApi,
  annotationsApi,
  labelClassesApi,
  type Image,
  type Annotation,
  type LabelClass,
} from '@/lib/api';
import { useAnnotationStore } from '@/stores/annotation-store';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  Check,
  X,
  Loader2,
  MousePointer,
  Square,
} from 'lucide-react';

export default function AnnotatePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const datasetId = params.datasetId as string;
  const imageId = params.imageId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    currentImage,
    imageUrl,
    annotations,
    labelClasses,
    selectedAnnotationId,
    selectedLabelClassId,
    isDrawing,
    drawingBox,
    setCurrentImage,
    setAnnotations,
    setLabelClasses,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    selectAnnotation,
    selectLabelClass,
    setIsDrawing,
    setDrawingBox,
  } = useAnnotationStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Load image and annotations
  useEffect(() => {
    async function loadData() {
      try {
        const [imageRes, classesRes] = await Promise.all([
          imagesApi.get(imageId),
          labelClassesApi.list(projectId),
        ]);

        const imageData = imageRes.data.data;
        const classesData = classesRes.data.data;

        if (imageData) {
          setCurrentImage(imageData.image, imageData.url);
          setAnnotations(imageData.image.annotations || []);
        }

        if (classesData) {
          setLabelClasses(classesData.classes);
          if (classesData.classes.length > 0 && !selectedLabelClassId) {
            selectLabelClass(classesData.classes[0].id);
          }
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load image',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [imageId, projectId, setCurrentImage, setAnnotations, setLabelClasses, selectLabelClass, toast]);

  // Load actual image for canvas
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setLoadedImage(img);
        calculateScale(img);
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Calculate scale to fit image in container
  const calculateScale = useCallback((img: HTMLImageElement) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = container.clientHeight - 40;
    const scaleX = maxWidth / img.width;
    const scaleY = maxHeight / img.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(newScale);
    setOffset({
      x: (container.clientWidth - img.width * newScale) / 2,
      y: (container.clientHeight - img.height * newScale) / 2,
    });
  }, []);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !loadedImage || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(loadedImage, 0, 0);

    // Draw annotations
    annotations.forEach((ann) => {
      const labelClass = labelClasses.find((c) => c.id === ann.labelClassId);
      const color = labelClass?.colorHex || '#3B82F6';
      const isSelected = ann.id === selectedAnnotationId;

      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 / scale : 2 / scale;
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);

      // Fill with semi-transparent color if selected
      if (isSelected) {
        ctx.fillStyle = color + '20';
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }

      // Draw label
      ctx.fillStyle = color;
      ctx.fillRect(ann.x, ann.y - 20 / scale, 80 / scale, 20 / scale);
      ctx.fillStyle = 'white';
      ctx.font = `${12 / scale}px Inter`;
      ctx.fillText(
        labelClass?.name || 'Unknown',
        ann.x + 4 / scale,
        ann.y - 6 / scale
      );
    });

    // Draw current drawing box
    if (drawingBox) {
      const labelClass = labelClasses.find((c) => c.id === selectedLabelClassId);
      const color = labelClass?.colorHex || '#3B82F6';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([5 / scale, 5 / scale]);
      ctx.strokeRect(drawingBox.x, drawingBox.y, drawingBox.width, drawingBox.height);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [loadedImage, annotations, drawingBox, scale, offset, selectedAnnotationId, labelClasses, selectedLabelClassId]);

  // Convert screen coordinates to image coordinates
  const screenToImage = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - offset.x) / scale,
      y: (screenY - rect.top - offset.y) / scale,
    };
  };

  // Mouse handlers for drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedLabelClassId) {
      toast({
        title: 'Select a label class',
        description: 'Please select a label class before drawing',
        variant: 'destructive',
      });
      return;
    }

    const pos = screenToImage(e.clientX, e.clientY);
    setDrawStart(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;

    const pos = screenToImage(e.clientX, e.clientY);
    setDrawingBox({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: Math.abs(pos.x - drawStart.x),
      height: Math.abs(pos.y - drawStart.y),
    });
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !drawingBox || !selectedLabelClassId || !currentImage) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawingBox(null);
      return;
    }

    // Validate box size
    if (drawingBox.width < 10 || drawingBox.height < 10) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawingBox(null);
      return;
    }

    // Create annotation
    try {
      const response = await annotationsApi.create(imageId, {
        labelClassId: selectedLabelClassId,
        x: Math.round(drawingBox.x),
        y: Math.round(drawingBox.y),
        width: Math.round(drawingBox.width),
        height: Math.round(drawingBox.height),
      });

      const labelClass = labelClasses.find((c) => c.id === selectedLabelClassId);

      addAnnotation({
        id: response.data.data!.annotationId,
        imageId,
        labelClassId: selectedLabelClassId,
        x: Math.round(drawingBox.x),
        y: Math.round(drawingBox.y),
        width: Math.round(drawingBox.width),
        height: Math.round(drawingBox.height),
        source: 'manual',
        status: 'approved',
        confidence: null,
        labelClass,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create annotation',
        variant: 'destructive',
      });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawingBox(null);
  };

  // Click handler for selecting annotations
  const handleClick = (e: React.MouseEvent) => {
    if (isDrawing) return;

    const pos = screenToImage(e.clientX, e.clientY);

    // Find clicked annotation
    const clicked = annotations.find(
      (ann) =>
        pos.x >= ann.x &&
        pos.x <= ann.x + ann.width &&
        pos.y >= ann.y &&
        pos.y <= ann.y + ann.height
    );

    selectAnnotation(clicked?.id || null);
  };

  // Delete selected annotation
  const handleDelete = async () => {
    if (!selectedAnnotationId) return;

    try {
      await annotationsApi.delete(selectedAnnotationId);
      removeAnnotation(selectedAnnotationId);
      toast({ title: 'Annotation deleted', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete annotation',
        variant: 'destructive',
      });
    }
  };

  // Update annotation status
  const handleStatusChange = async (status: 'approved' | 'rejected') => {
    if (!selectedAnnotationId) return;

    try {
      await annotationsApi.update(selectedAnnotationId, { status });
      updateAnnotation(selectedAnnotationId, { status });
      toast({ title: `Annotation ${status}`, variant: 'success' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update annotation',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 bg-white">
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/datasets/${datasetId}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <span className="text-sm text-neutral-500 ml-4">{currentImage?.fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">
              {annotations.length} annotations
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 bg-neutral-100 overflow-hidden relative"
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-neutral-200 bg-white flex flex-col">
        {/* Label Classes */}
        <div className="p-4 border-b border-neutral-200">
          <h3 className="font-semibold text-sm mb-3">Label Classes</h3>
          <div className="space-y-1">
            {labelClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => selectLabelClass(cls.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedLabelClassId === cls.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <div
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: cls.colorHex }}
                />
                {cls.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Annotation */}
        {selectedAnnotation && (
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-semibold text-sm mb-3">Selected Annotation</h3>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-neutral-500">Class:</span>{' '}
                {selectedAnnotation.labelClass?.name || 'Unknown'}
              </div>
              <div className="text-sm">
                <span className="text-neutral-500">Source:</span>{' '}
                <span
                  className={
                    selectedAnnotation.source === 'auto'
                      ? 'text-primary-600'
                      : 'text-neutral-900'
                  }
                >
                  {selectedAnnotation.source}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-neutral-500">Status:</span>{' '}
                <span
                  className={
                    selectedAnnotation.status === 'approved'
                      ? 'text-success'
                      : selectedAnnotation.status === 'rejected'
                      ? 'text-error'
                      : 'text-warning'
                  }
                >
                  {selectedAnnotation.status}
                </span>
              </div>
              {selectedAnnotation.confidence !== null && (
                <div className="text-sm">
                  <span className="text-neutral-500">Confidence:</span>{' '}
                  {Math.round(selectedAnnotation.confidence * 100)}%
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleStatusChange('approved')}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleStatusChange('rejected')}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Annotations List */}
        <div className="flex-1 overflow-auto p-4">
          <h3 className="font-semibold text-sm mb-3">All Annotations</h3>
          {annotations.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">
              No annotations yet. Draw a bounding box to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {annotations.map((ann) => {
                const labelClass = labelClasses.find((c) => c.id === ann.labelClassId);
                return (
                  <button
                    key={ann.id}
                    onClick={() => selectAnnotation(ann.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                      selectedAnnotationId === ann.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: labelClass?.colorHex }}
                    />
                    <span className="flex-1 truncate">{labelClass?.name}</span>
                    <span
                      className={`text-xs ${
                        ann.status === 'approved'
                          ? 'text-success'
                          : ann.status === 'rejected'
                          ? 'text-error'
                          : 'text-warning'
                      }`}
                    >
                      {ann.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
