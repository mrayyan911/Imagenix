'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { projectsApi } from '@/lib/api';
import { useProjectStore } from '@/stores/project-store';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen, Search, Loader2, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProjectsPage() {
  const { toast } = useToast();
  const { projects, setProjects, removeProject } = useProjectStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        setIsLoading(false);
      }
    }

    loadProjects();
  }, [setProjects, toast]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await projectsApi.delete(projectId);
      removeProject(projectId);
      toast({
        title: 'Project deleted',
        description: 'The project has been deleted successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Projects</h1>
            <p className="text-neutral-500 mt-1">Manage your annotation projects</p>
          </div>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <FolderOpen className="mx-auto h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="mt-2 text-neutral-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first project to get started'}
              </p>
              {!searchQuery && (
                <Link href="/projects/new" className="mt-4 inline-block">
                  <Button>Create Project</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900">{project.name}</h3>
                          <p className="text-sm text-neutral-500">
                            {formatDate(project.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-error"
                        onClick={(e) => handleDelete(project.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {project.description && (
                      <p className="mt-4 text-sm text-neutral-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
                      <span>{project.datasetCount || 0} datasets</span>
                      <span>{project.imageCount || 0} images</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
