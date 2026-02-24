'use client';

import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { labelClassesApi, type LabelClassWithCount } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Tags,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface LabelClassesManagerProps {
  projectId: string;
  selectedImageIds: Set<string>;
  onAnnotationsDeleted?: () => void;
}

export interface LabelClassesManagerRef {
  refresh: () => Promise<void>;
}

export const LabelClassesManager = forwardRef<LabelClassesManagerRef, LabelClassesManagerProps>(
  function LabelClassesManager({ projectId, selectedImageIds, onAnnotationsDeleted }, ref) {
  const { toast } = useToast();
  const [labelClasses, setLabelClasses] = useState<LabelClassWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingFromImages, setIsDeletingFromImages] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteFromImagesConfirm, setShowDeleteFromImagesConfirm] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);

  const loadLabelClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await labelClassesApi.listWithCounts(projectId);
      setLabelClasses(response.data.data?.classes || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load label classes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    loadLabelClasses();
  }, [loadLabelClasses]);

  useImperativeHandle(ref, () => ({
    refresh: loadLabelClasses,
  }), [loadLabelClasses]);

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const toggleSelectAllClasses = () => {
    if (selectedClassIds.size === labelClasses.length) {
      setSelectedClassIds(new Set());
    } else {
      setSelectedClassIds(new Set(labelClasses.map((c) => c.id)));
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const response = await labelClassesApi.deleteAll(projectId);
      const deleted = response.data.data?.deleted || 0;
      toast({
        title: 'Success',
        description: `Deleted ${deleted} label class${deleted !== 1 ? 'es' : ''} and all associated annotations`,
        variant: 'success',
      });
      setSelectedClassIds(new Set());
      await loadLabelClasses();
      onAnnotationsDeleted?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to delete label classes',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const handleDeleteSingleClass = async (classId: string, className: string) => {
    setDeletingClassId(classId);
    try {
      const response = await labelClassesApi.delete(projectId, classId, true);
      const deletedAnnotations = response.data.data?.deletedAnnotations || 0;
      
      toast({
        title: 'Success',
        description: deletedAnnotations > 0
          ? `Deleted "${className}" class and ${deletedAnnotations} annotation${deletedAnnotations !== 1 ? 's' : ''}`
          : `Deleted "${className}" class`,
        variant: 'success',
      });
      
      setSelectedClassIds((prev) => {
        const next = new Set(prev);
        next.delete(classId);
        return next;
      });
      setConfirmDeleteClassId(null);
      await loadLabelClasses();
      onAnnotationsDeleted?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to delete label class',
        variant: 'destructive',
      });
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleDeleteFromSelectedImages = async () => {
    if (selectedImageIds.size === 0) {
      toast({
        title: 'No images selected',
        description: 'Please select images from the grid first',
        variant: 'destructive',
      });
      return;
    }

    setIsDeletingFromImages(true);
    try {
      const response = await labelClassesApi.deleteAnnotationsFromImages(projectId, {
        imageIds: Array.from(selectedImageIds),
        labelClassIds: selectedClassIds.size > 0 ? Array.from(selectedClassIds) : undefined,
      });
      const deleted = response.data.data?.deleted || 0;
      const deletedClasses = response.data.data?.deletedClasses || 0;
      
      let description = `Deleted ${deleted} annotation${deleted !== 1 ? 's' : ''}`;
      if (deletedClasses > 0) {
        description += ` and removed ${deletedClasses} empty class${deletedClasses !== 1 ? 'es' : ''}`;
      }
      
      toast({
        title: 'Success',
        description,
        variant: 'success',
      });
      
      setSelectedClassIds(new Set());
      await loadLabelClasses();
      onAnnotationsDeleted?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to delete annotations',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingFromImages(false);
      setShowDeleteFromImagesConfirm(false);
    }
  };

  const totalAnnotations = labelClasses.reduce((sum, c) => sum + c.annotationCount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tags className="h-5 w-5" />
            Label Classes
          </CardTitle>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-neutral-100 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-neutral-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            )}
          </button>
        </div>
        {!isExpanded && (
          <p className="text-sm text-neutral-500 mt-1">
            {labelClasses.length} class{labelClasses.length !== 1 ? 'es' : ''} · {totalAnnotations} detection{totalAnnotations !== 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : labelClasses.length === 0 ? (
            <div className="text-center py-6">
              <Tags className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm text-neutral-500">No label classes yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Run auto-annotation to create classes
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {labelClasses.length} class{labelClasses.length !== 1 ? 'es' : ''} · {totalAnnotations} total detection{totalAnnotations !== 1 ? 's' : ''}
                </span>
                {labelClasses.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllClasses}
                    className="text-primary-600 hover:text-primary-800 font-medium"
                  >
                    {selectedClassIds.size === labelClasses.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Label Classes List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {labelClasses.map((labelClass) => {
                  const isSelected = selectedClassIds.has(labelClass.id);
                  const isConfirmingDelete = confirmDeleteClassId === labelClass.id;
                  const isDeleting = deletingClassId === labelClass.id;

                  if (isConfirmingDelete) {
                    return (
                      <div
                        key={labelClass.id}
                        className="p-2.5 rounded-lg border border-red-300 bg-red-50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: labelClass.colorHex }}
                          />
                          <span className="font-medium text-sm text-red-800 truncate">
                            Delete "{labelClass.name}"?
                          </span>
                        </div>
                        <p className="text-xs text-red-600 mb-2">
                          This will delete {labelClass.annotationCount} annotation{labelClass.annotationCount !== 1 ? 's' : ''}.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => setConfirmDeleteClassId(null)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => handleDeleteSingleClass(labelClass.id, labelClass.name)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Delete'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={labelClass.id}
                      className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <div
                        className="flex items-center gap-2.5 flex-1 cursor-pointer"
                        onClick={() => toggleClassSelection(labelClass.id)}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: labelClass.colorHex }}
                        />
                        <span className="font-medium text-sm text-neutral-800 truncate max-w-[100px]">
                          {labelClass.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                          {labelClass.annotationCount}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteClassId(labelClass.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 text-neutral-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                          title={`Delete ${labelClass.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                {/* Delete from selected images */}
                {!showDeleteFromImagesConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-neutral-700"
                    onClick={() => setShowDeleteFromImagesConfirm(true)}
                    disabled={selectedImageIds.size === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {selectedImageIds.size > 0
                      ? `Delete from ${selectedImageIds.size} selected image${selectedImageIds.size !== 1 ? 's' : ''}`
                      : 'Select images to delete annotations'}
                  </Button>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">Confirm deletion</p>
                        <p className="text-amber-700 text-xs mt-0.5">
                          {selectedClassIds.size > 0
                            ? `Delete annotations for ${selectedClassIds.size} selected class${selectedClassIds.size !== 1 ? 'es' : ''} from ${selectedImageIds.size} image${selectedImageIds.size !== 1 ? 's' : ''}`
                            : `Delete all annotations from ${selectedImageIds.size} image${selectedImageIds.size !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowDeleteFromImagesConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleDeleteFromSelectedImages}
                        disabled={isDeletingFromImages}
                      >
                        {isDeletingFromImages ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete all label classes */}
                {!showDeleteAllConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => setShowDeleteAllConfirm(true)}
                    disabled={labelClasses.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Classes & Annotations
                  </Button>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-red-800">This action cannot be undone</p>
                        <p className="text-red-700 text-xs mt-0.5">
                          This will permanently delete all {labelClasses.length} label class{labelClasses.length !== 1 ? 'es' : ''} and {totalAnnotations} annotation{totalAnnotations !== 1 ? 's' : ''}.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowDeleteAllConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleDeleteAll}
                        disabled={isDeletingAll}
                      >
                        {isDeletingAll ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Delete All'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Help text */}
              <p className="text-xs text-neutral-500 pt-1">
                {selectedClassIds.size > 0
                  ? `${selectedClassIds.size} class${selectedClassIds.size !== 1 ? 'es' : ''} selected. Actions will apply to selected classes only.`
                  : 'Click on classes to select them for targeted deletion.'}
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
});
