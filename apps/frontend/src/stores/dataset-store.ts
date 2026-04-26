import { create } from 'zustand';
import { jobsApi } from '@/lib/api';

interface DatasetJobState {
  jobId: string | null;
  jobType: 'auto-annotation' | 'export' | null;
  progress: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | null;
  startTime: number | null;
  totalImages: number;
  errorMessage?: string;
}

interface DatasetState {
  // Selected images per dataset
  selectedImages: Record<string, Set<string>>;

  // Active jobs per dataset
  activeJobs: Record<string, DatasetJobState>;

  // Polling intervals
  pollingIntervals: Record<string, NodeJS.Timeout>;

  // Actions
  selectImage: (datasetId: string, imageId: string) => void;
  deselectImage: (datasetId: string, imageId: string) => void;
  toggleImage: (datasetId: string, imageId: string) => void;
  selectAll: (datasetId: string, imageIds: string[]) => void;
  deselectAll: (datasetId: string) => void;
  getSelectedImages: (datasetId: string) => Set<string>;

  // Job management
  startJob: (
    datasetId: string,
    jobId: string,
    jobType: 'auto-annotation' | 'export',
    totalImages: number
  ) => void;
  updateJobProgress: (
    datasetId: string,
    progress: number,
    status?: string,
    errorMessage?: string
  ) => void;
  clearJob: (datasetId: string) => void;
  getJob: (datasetId: string) => DatasetJobState | null;

  // Polling
  startPolling: (datasetId: string, jobId: string, onComplete?: () => void) => void;
  stopPolling: (datasetId: string) => void;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  selectedImages: {},
  activeJobs: {},
  pollingIntervals: {},

  selectImage: (datasetId, imageId) => {
    set((state) => {
      const current = state.selectedImages[datasetId] || new Set();
      const updated = new Set(current);
      updated.add(imageId);
      return {
        selectedImages: { ...state.selectedImages, [datasetId]: updated },
      };
    });
  },

  deselectImage: (datasetId, imageId) => {
    set((state) => {
      const current = state.selectedImages[datasetId] || new Set();
      const updated = new Set(current);
      updated.delete(imageId);
      return {
        selectedImages: { ...state.selectedImages, [datasetId]: updated },
      };
    });
  },

  toggleImage: (datasetId, imageId) => {
    const current = get().selectedImages[datasetId] || new Set();
    if (current.has(imageId)) {
      get().deselectImage(datasetId, imageId);
    } else {
      get().selectImage(datasetId, imageId);
    }
  },

  selectAll: (datasetId, imageIds) => {
    set((state) => ({
      selectedImages: { ...state.selectedImages, [datasetId]: new Set(imageIds) },
    }));
  },

  deselectAll: (datasetId) => {
    set((state) => ({
      selectedImages: { ...state.selectedImages, [datasetId]: new Set() },
    }));
  },

  getSelectedImages: (datasetId) => {
    return get().selectedImages[datasetId] || new Set();
  },

  startJob: (datasetId, jobId, jobType, totalImages) => {
    set((state) => ({
      activeJobs: {
        ...state.activeJobs,
        [datasetId]: {
          jobId,
          jobType,
          progress: 0,
          status: 'queued',
          startTime: Date.now(),
          totalImages,
        },
      },
    }));
  },

  updateJobProgress: (datasetId, progress, status, errorMessage) => {
    set((state) => {
      const current = state.activeJobs[datasetId];
      if (!current) return state;
      return {
        activeJobs: {
          ...state.activeJobs,
          [datasetId]: {
            ...current,
            progress,
            status: (status as DatasetJobState['status']) || current.status,
            errorMessage: errorMessage || current.errorMessage,
          },
        },
      };
    });
  },

  clearJob: (datasetId) => {
    get().stopPolling(datasetId);
    set((state) => {
      const { [datasetId]: _, ...rest } = state.activeJobs;
      return { activeJobs: rest };
    });
  },

  getJob: (datasetId) => {
    return get().activeJobs[datasetId] || null;
  },

  startPolling: (datasetId, jobId, onComplete) => {
    // Stop any existing polling
    get().stopPolling(datasetId);

    const poll = async () => {
      try {
        const response = await jobsApi.getStatus(jobId);
        const job = response.data.data;

        if (!job) return;

        get().updateJobProgress(datasetId, job.progress || 0, job.status, job.errorMessage);

        if (job.status === 'succeeded' || job.status === 'failed') {
          get().stopPolling(datasetId);

          // Keep job state visible for 2 seconds, then clear
          setTimeout(() => {
            const finalStatus = job.status;
            get().clearJob(datasetId);
            if (finalStatus === 'succeeded' && onComplete) {
              onComplete();
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, 2000);
    set((state) => ({
      pollingIntervals: { ...state.pollingIntervals, [datasetId]: interval },
    }));
  },

  stopPolling: (datasetId) => {
    const interval = get().pollingIntervals[datasetId];
    if (interval) {
      clearInterval(interval);
      set((state) => {
        const { [datasetId]: _, ...rest } = state.pollingIntervals;
        return { pollingIntervals: rest };
      });
    }
  },
}));
