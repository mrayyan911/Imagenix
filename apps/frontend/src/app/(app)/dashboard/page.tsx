'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { projectsApi, type Project } from '@/lib/api';
import { useProjectStore } from '@/stores/project-store';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  FolderOpen,
  Image,
  Tag,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { toast } = useToast();
  const { projects, setProjects, isLoading, setLoading } = useProjectStore();
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await projectsApi.list();
        setProjects(response.data.data?.projects || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingProjects(false);
      }
    }

    loadProjects();
  }, [setProjects, toast]);

  const stats = {
    totalProjects: projects.length,
    totalImages: projects.reduce((sum, p) => sum + (p.imageCount || 0), 0),
    totalDatasets: projects.reduce((sum, p) => sum + (p.datasetCount || 0), 0),
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-neutral-500 mt-1">
              Manage your datasets and annotation projects
            </p>
          </div>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                Total Projects
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                Total Images
              </CardTitle>
              <Image className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalImages}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                Total Datasets
              </CardTitle>
              <Tag className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDatasets}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto h-12 w-12 text-neutral-300" />
                <h3 className="mt-4 text-lg font-medium text-neutral-900">No projects yet</h3>
                <p className="mt-2 text-neutral-500">
                  Create your first project to get started
                </p>
                <Link href="/projects/new" className="mt-4 inline-block">
                  <Button>Create Project</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between py-4 hover:bg-neutral-50 -mx-4 px-4 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium text-neutral-900">{project.name}</h4>
                      <p className="text-sm text-neutral-500 mt-1">
                        {project.datasetCount || 0} datasets · {project.imageCount || 0} images
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-neutral-400">
                        {formatDate(project.updatedAt)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-neutral-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
