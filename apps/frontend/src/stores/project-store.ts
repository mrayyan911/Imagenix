import { create } from 'zustand';
import type { Project, Dataset, LabelClass } from '@/lib/api';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  datasets: Dataset[];
  labelClasses: LabelClass[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setDatasets: (datasets: Dataset[]) => void;
  setLabelClasses: (classes: LabelClass[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  addDataset: (dataset: Dataset) => void;
  addLabelClass: (labelClass: LabelClass) => void;
  removeLabelClass: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  datasets: [],
  labelClasses: [],
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setDatasets: (datasets) => set({ datasets }),
  setLabelClasses: (classes) => set({ labelClasses: classes }),

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),

  addDataset: (dataset) =>
    set((state) => ({ datasets: [...state.datasets, dataset] })),

  addLabelClass: (labelClass) =>
    set((state) => ({ labelClasses: [...state.labelClasses, labelClass] })),

  removeLabelClass: (id) =>
    set((state) => ({
      labelClasses: state.labelClasses.filter((c) => c.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      projects: [],
      currentProject: null,
      datasets: [],
      labelClasses: [],
      isLoading: false,
      error: null,
    }),
}));
