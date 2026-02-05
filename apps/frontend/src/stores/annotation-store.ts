import { create } from 'zustand';
import type { Image, Annotation, LabelClass } from '@/lib/api';

interface AnnotationState {
  // Current image being annotated
  currentImage: Image | null;
  imageUrl: string | null;

  // Annotations for current image
  annotations: Annotation[];

  // Available label classes
  labelClasses: LabelClass[];

  // Selected state
  selectedAnnotationId: string | null;
  selectedLabelClassId: string | null;

  // Drawing state
  isDrawing: boolean;
  drawingBox: { x: number; y: number; width: number; height: number } | null;

  // UI state
  showDraftAnnotations: boolean;
  confidenceThreshold: number;

  // Actions
  setCurrentImage: (image: Image | null, url: string | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setLabelClasses: (classes: LabelClass[]) => void;
  selectAnnotation: (id: string | null) => void;
  selectLabelClass: (id: string | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  setDrawingBox: (box: { x: number; y: number; width: number; height: number } | null) => void;
  setShowDraftAnnotations: (show: boolean) => void;
  setConfidenceThreshold: (threshold: number) => void;
  reset: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  currentImage: null,
  imageUrl: null,
  annotations: [],
  labelClasses: [],
  selectedAnnotationId: null,
  selectedLabelClassId: null,
  isDrawing: false,
  drawingBox: null,
  showDraftAnnotations: true,
  confidenceThreshold: 0.35,

  setCurrentImage: (image, url) =>
    set({
      currentImage: image,
      imageUrl: url,
      annotations: image?.annotations || [],
      selectedAnnotationId: null,
    }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  setLabelClasses: (labelClasses) => set({ labelClasses }),

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  selectLabelClass: (id) => set({ selectedLabelClassId: id }),

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  setDrawingBox: (drawingBox) => set({ drawingBox }),

  setShowDraftAnnotations: (showDraftAnnotations) => set({ showDraftAnnotations }),

  setConfidenceThreshold: (confidenceThreshold) => set({ confidenceThreshold }),

  reset: () =>
    set({
      currentImage: null,
      imageUrl: null,
      annotations: [],
      selectedAnnotationId: null,
      selectedLabelClassId: null,
      isDrawing: false,
      drawingBox: null,
    }),
}));
