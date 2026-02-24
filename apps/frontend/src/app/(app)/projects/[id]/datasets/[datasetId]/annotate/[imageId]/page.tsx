'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Plus,
} from 'lucide-react';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

const HANDLE_SIZE = 8;

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

  // New label class form state
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number } | null>(null);
  const [originalBox, setOriginalBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle>(null);

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

        // Draw resize handles for selected annotation
        const handleSize = HANDLE_SIZE / scale;
        const halfHandle = handleSize / 2;

        const handles = [
          { x: ann.x, y: ann.y }, // nw
          { x: ann.x + ann.width / 2, y: ann.y }, // n
          { x: ann.x + ann.width, y: ann.y }, // ne
          { x: ann.x + ann.width, y: ann.y + ann.height / 2 }, // e
          { x: ann.x + ann.width, y: ann.y + ann.height }, // se
          { x: ann.x + ann.width / 2, y: ann.y + ann.height }, // s
          { x: ann.x, y: ann.y + ann.height }, // sw
          { x: ann.x, y: ann.y + ann.height / 2 }, // w
        ];

        handles.forEach((h) => {
          ctx.fillStyle = 'white';
          ctx.fillRect(h.x - halfHandle, h.y - halfHandle, handleSize, handleSize);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 / scale;
          ctx.strokeRect(h.x - halfHandle, h.y - halfHandle, handleSize, handleSize);
        });
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
  }, [loadedImage, annotations, drawingBox, scale, offset, selectedAnnotationId, labelClasses, selectedLabelClassId, isResizing]);

  // Convert screen coordinates to image coordinates
  const screenToImage = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - offset.x) / scale,
      y: (screenY - rect.top - offset.y) / scale,
    };
  };

  // Get resize handle at position for a given annotation
  const getResizeHandleAtPosition = (pos: { x: number; y: number }, ann: Annotation): ResizeHandle => {
    const handleSize = HANDLE_SIZE / scale;
    const halfHandle = handleSize / 2;

    const handles: { handle: ResizeHandle; x: number; y: number }[] = [
      { handle: 'nw', x: ann.x, y: ann.y },
      { handle: 'n', x: ann.x + ann.width / 2, y: ann.y },
      { handle: 'ne', x: ann.x + ann.width, y: ann.y },
      { handle: 'e', x: ann.x + ann.width, y: ann.y + ann.height / 2 },
      { handle: 'se', x: ann.x + ann.width, y: ann.y + ann.height },
      { handle: 's', x: ann.x + ann.width / 2, y: ann.y + ann.height },
      { handle: 'sw', x: ann.x, y: ann.y + ann.height },
      { handle: 'w', x: ann.x, y: ann.y + ann.height / 2 },
    ];

    for (const h of handles) {
      if (
        pos.x >= h.x - halfHandle &&
        pos.x <= h.x + halfHandle &&
        pos.y >= h.y - halfHandle &&
        pos.y <= h.y + halfHandle
      ) {
        return h.handle;
      }
    }

    return null;
  };

  // Get cursor style based on handle
  const getCursorForHandle = (handle: ResizeHandle): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      default:
        return 'crosshair';
    }
  };

  // Mouse handlers for drawing and resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = screenToImage(e.clientX, e.clientY);

    // Check if clicking on a resize handle of selected annotation
    if (selectedAnnotationId) {
      const selectedAnn = annotations.find((a) => a.id === selectedAnnotationId);
      if (selectedAnn) {
        const handle = getResizeHandleAtPosition(pos, selectedAnn);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setResizeStart(pos);
          setOriginalBox({
            x: selectedAnn.x,
            y: selectedAnn.y,
            width: selectedAnn.width,
            height: selectedAnn.height,
          });
          return;
        }
      }
    }

    // Otherwise, start drawing a new annotation
    if (!selectedLabelClassId) {
      toast({
        title: 'Select a label class',
        description: 'Please select a label class before drawing',
        variant: 'destructive',
      });
      return;
    }

    setDrawStart(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = screenToImage(e.clientX, e.clientY);

    // Handle resizing
    if (isResizing && resizeHandle && resizeStart && originalBox && selectedAnnotationId) {
      const deltaX = pos.x - resizeStart.x;
      const deltaY = pos.y - resizeStart.y;

      let newX = originalBox.x;
      let newY = originalBox.y;
      let newWidth = originalBox.width;
      let newHeight = originalBox.height;

      // Apply resize based on handle
      switch (resizeHandle) {
        case 'nw':
          newX = originalBox.x + deltaX;
          newY = originalBox.y + deltaY;
          newWidth = originalBox.width - deltaX;
          newHeight = originalBox.height - deltaY;
          break;
        case 'n':
          newY = originalBox.y + deltaY;
          newHeight = originalBox.height - deltaY;
          break;
        case 'ne':
          newY = originalBox.y + deltaY;
          newWidth = originalBox.width + deltaX;
          newHeight = originalBox.height - deltaY;
          break;
        case 'e':
          newWidth = originalBox.width + deltaX;
          break;
        case 'se':
          newWidth = originalBox.width + deltaX;
          newHeight = originalBox.height + deltaY;
          break;
        case 's':
          newHeight = originalBox.height + deltaY;
          break;
        case 'sw':
          newX = originalBox.x + deltaX;
          newWidth = originalBox.width - deltaX;
          newHeight = originalBox.height + deltaY;
          break;
        case 'w':
          newX = originalBox.x + deltaX;
          newWidth = originalBox.width - deltaX;
          break;
      }

      // Ensure minimum size
      if (newWidth < 10) {
        if (resizeHandle.includes('w')) {
          newX = originalBox.x + originalBox.width - 10;
        }
        newWidth = 10;
      }
      if (newHeight < 10) {
        if (resizeHandle.includes('n')) {
          newY = originalBox.y + originalBox.height - 10;
        }
        newHeight = 10;
      }

      // Clamp to image bounds
      if (currentImage) {
        newX = Math.max(0, Math.min(newX, currentImage.width - newWidth));
        newY = Math.max(0, Math.min(newY, currentImage.height - newHeight));
        newWidth = Math.min(newWidth, currentImage.width - newX);
        newHeight = Math.min(newHeight, currentImage.height - newY);
      }

      // Update annotation locally for visual feedback
      updateAnnotation(selectedAnnotationId, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
      return;
    }

    // Handle drawing
    if (isDrawing && drawStart) {
      setDrawingBox({
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
      });
      return;
    }

    // Check for hover over resize handles
    if (selectedAnnotationId && !isDrawing && !isResizing) {
      const selectedAnn = annotations.find((a) => a.id === selectedAnnotationId);
      if (selectedAnn) {
        const handle = getResizeHandleAtPosition(pos, selectedAnn);
        setHoveredHandle(handle);
      }
    }
  };

  const handleMouseUp = async () => {
    // Handle resize completion
    if (isResizing && selectedAnnotationId) {
      const selectedAnn = annotations.find((a) => a.id === selectedAnnotationId);
      if (selectedAnn) {
        try {
          await annotationsApi.update(selectedAnnotationId, {
            x: selectedAnn.x,
            y: selectedAnn.y,
            width: selectedAnn.width,
            height: selectedAnn.height,
          });
        } catch (error) {
          // Revert to original if save fails
          if (originalBox) {
            updateAnnotation(selectedAnnotationId, originalBox);
          }
          toast({
            title: 'Error',
            description: 'Failed to update annotation',
            variant: 'destructive',
          });
        }
      }

      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
      setOriginalBox(null);
      return;
    }

    // Handle drawing completion
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

  // Create new label class
  const handleCreateLabelClass = async () => {
    const trimmedName = newLabelName.trim();
    
    // Validation
    if (!trimmedName) {
      setLabelError('Label name is required');
      return;
    }

    if (trimmedName.length > 80) {
      setLabelError('Label name must be 80 characters or less');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const isDuplicate = labelClasses.some(
      (cls) => cls.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setLabelError('A label with this name already exists');
      return;
    }

    setIsCreatingLabel(true);
    setLabelError(null);

    try {
      const response = await labelClassesApi.create(projectId, {
        name: trimmedName,
        colorHex: newLabelColor,
      });

      const newClass: LabelClass = {
        id: response.data.data!.classId,
        projectId,
        name: trimmedName,
        colorHex: newLabelColor,
        createdAt: new Date().toISOString(),
      };

      setLabelClasses([...labelClasses, newClass]);
      selectLabelClass(newClass.id);

      // Reset form
      setNewLabelName('');
      setNewLabelColor(getNextColor());
      setShowAddLabel(false);

      toast({
        title: 'Label class created',
        description: `"${trimmedName}" is now available for annotation`,
        variant: 'success',
      });
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create label class';
      setLabelError(message);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  // Get next available color (one not already in use)
  const getNextColor = () => {
    const usedColors = new Set(labelClasses.map((cls) => cls.colorHex));
    const availableColor = PRESET_COLORS.find((color) => !usedColors.has(color));
    return availableColor || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  };

  // Initialize color when showing form
  const handleShowAddLabel = () => {
    setNewLabelColor(getNextColor());
    setNewLabelName('');
    setLabelError(null);
    setShowAddLabel(true);
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
            style={{ cursor: isResizing ? getCursorForHandle(resizeHandle) : getCursorForHandle(hoveredHandle) }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp();
              setHoveredHandle(null);
            }}
            onClick={handleClick}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-neutral-200 bg-white flex flex-col">
        {/* Label Classes */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Label Classes</h3>
            {!showAddLabel && (
              <button
                type="button"
                onClick={handleShowAddLabel}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-primary-600 transition-colors"
                title="Add new label class"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Add Label Form */}
          {showAddLabel && (
            <div className="mb-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="space-y-3">
                <div>
                  <Input
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={(e) => {
                      setNewLabelName(e.target.value);
                      setLabelError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateLabelClass();
                      } else if (e.key === 'Escape') {
                        setShowAddLabel(false);
                      }
                    }}
                    className="h-8 text-sm"
                    autoFocus
                    maxLength={80}
                  />
                  {labelError && (
                    <p className="text-xs text-red-600 mt-1">{labelError}</p>
                  )}
                </div>

                {/* Color Picker */}
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className={`w-6 h-6 rounded-md transition-all ${
                          newLabelColor === color
                            ? 'ring-2 ring-offset-1 ring-neutral-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => setShowAddLabel(false)}
                    disabled={isCreatingLabel}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8"
                    onClick={handleCreateLabelClass}
                    disabled={isCreatingLabel || !newLabelName.trim()}
                  >
                    {isCreatingLabel ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Label Classes List */}
          <div className="space-y-1">
            {labelClasses.length === 0 && !showAddLabel ? (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500 mb-2">No label classes yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowAddLabel}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Label Class
                </Button>
              </div>
            ) : (
              labelClasses.map((cls) => (
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
              ))
            )}
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
