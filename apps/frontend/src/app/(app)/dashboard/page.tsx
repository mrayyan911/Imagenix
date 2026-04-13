'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonStatCard, SkeletonRow } from '@/components/ui/skeleton';
import { AnimatedCounter } from '@/components/animations/animated-counter';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { projectsApi } from '@/lib/api';
import { useProjectStore } from '@/stores/project-store';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  FolderOpen,
  Image,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { toast } = useToast();
  const { projects, setProjects } = useProjectStore();
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
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
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
        </motion.div>

        {/* Stats Cards */}
        {isLoadingProjects ? (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        ) : (
          <StaggerChildren className="grid gap-4 md:grid-cols-3 mb-8">
            <StaggerItem>
              <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">
                    Total Projects
                  </CardTitle>
                  <FolderOpen className="h-4 w-4 text-neutral-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter end={stats.totalProjects} />
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">
                    Total Images
                  </CardTitle>
                  <Image className="h-4 w-4 text-neutral-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter end={stats.totalImages} />
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">
                    Total Datasets
                  </CardTitle>
                  <Tag className="h-4 w-4 text-neutral-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter end={stats.totalDatasets} />
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerChildren>
        )}

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProjects ? (
              <div className="divide-y divide-neutral-100">
                {[...Array(3)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
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
                {projects.slice(0, 5).map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between py-4 hover:bg-neutral-50 -mx-4 px-4 transition-colors rounded-lg"
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
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
