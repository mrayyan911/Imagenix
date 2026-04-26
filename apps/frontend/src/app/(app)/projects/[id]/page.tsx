'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { projectsApi, datasetsApi, labelClassesApi } from '@/lib/api';
import { useProjectStore } from '@/stores/project-store';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, FolderOpen, Image, Tag, Loader2, Database, Trash2 } from 'lucide-react';
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  const {
    currentProject,
    datasets,
    labelClasses,
    setCurrentProject,
    setDatasets,
    setLabelClasses,
    addDataset,
    addLabelClass,
    removeLabelClass,
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(true);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        const response = await projectsApi.get(projectId);
        const data = response.data.data;
        if (data) {
          setCurrentProject(data.project);
          setDatasets(data.datasets);
          setLabelClasses(data.labelClasses);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load project',
          variant: 'destructive',
        });
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    }

    loadProject();
  }, [projectId, setCurrentProject, setDatasets, setLabelClasses, toast, router]);

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) return;

    setIsCreatingDataset(true);
    try {
      const response = await datasetsApi.create(projectId, { name: newDatasetName });
      const datasetId = response.data.data?.datasetId;

      addDataset({
        id: datasetId!,
        name: newDatasetName,
        status: 'active',
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageCount: 0,
        annotatedImageCount: 0,
        annotationCount: 0,
      });

      setNewDatasetName('');
      toast({
        title: 'Dataset created',
        description: 'Your dataset has been created successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to create dataset',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;

    setIsCreatingClass(true);
    try {
      const response = await labelClassesApi.create(projectId, { name: newClassName });
      const classId = response.data.data?.classId;

      addLabelClass({
        id: classId!,
        projectId,
        name: newClassName,
        colorHex: '#3B82F6',
        createdAt: new Date().toISOString(),
      });

      setNewClassName('');
      toast({
        title: 'Label class created',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to create label class',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await labelClassesApi.delete(projectId, classId);
      removeLabelClass(classId);
      toast({
        title: 'Label class deleted',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to delete label class',
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

  if (!currentProject) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">{currentProject.name}</h1>
          {currentProject.description && (
            <p className="text-neutral-500 mt-2">{currentProject.description}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Datasets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Dataset */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Datasets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Dataset name..."
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDataset()}
                  />
                  <Button onClick={handleCreateDataset} disabled={isCreatingDataset}>
                    {isCreatingDataset ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {datasets.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <FolderOpen className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                    <p>No datasets yet. Create one to start uploading images.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {datasets.map((dataset) => (
                      <Link
                        key={dataset.id}
                        href={`/projects/${projectId}/datasets/${dataset.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Image className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-900">{dataset.name}</h4>
                            <p className="text-sm text-neutral-500">
                              {dataset.imageCount || 0} images · {dataset.annotationCount || 0}{' '}
                              annotations
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Label Classes */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Label Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Class name..."
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                  />
                  <Button size="icon" onClick={handleCreateClass} disabled={isCreatingClass}>
                    {isCreatingClass ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {labelClasses.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4">No label classes yet</p>
                ) : (
                  <div className="space-y-2">
                    {labelClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-neutral-50 group"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded"
                            style={{ backgroundColor: cls.colorHex }}
                          />
                          <span className="text-sm">{cls.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteClass(cls.id)}
                        >
                          <Trash2 className="h-3 w-3 text-neutral-400 hover:text-error" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
