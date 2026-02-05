import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          useAuthStore.getState().setTokens(accessToken, newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; issue: string }[];
  };
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; fullName?: string }) =>
    api.post<ApiResponse<{ userId: string; email: string }>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<
      ApiResponse<{
        accessToken: string;
        refreshToken: string;
        expiresInSeconds: number;
        user: { id: string; email: string; fullName: string | null; role: string; plan: string };
      }>
    >('/auth/login', data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      refreshToken,
    }),

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// Projects API
export const projectsApi = {
  list: () => api.get<ApiResponse<{ projects: Project[] }>>('/projects'),

  get: (id: string) =>
    api.get<ApiResponse<{ project: Project; labelClasses: LabelClass[]; datasets: Dataset[] }>>(
      `/projects/${id}`
    ),

  create: (data: { name: string; description?: string }) =>
    api.post<ApiResponse<{ projectId: string }>>('/projects', data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Datasets API
export const datasetsApi = {
  create: (projectId: string, data: { name: string }) =>
    api.post<ApiResponse<{ datasetId: string }>>(`/projects/${projectId}/datasets`, data),

  get: (id: string) =>
    api.get<ApiResponse<{ dataset: Dataset; labelClasses: LabelClass[] }>>(`/datasets/${id}`),
};

// Label Classes API
export const labelClassesApi = {
  list: (projectId: string) =>
    api.get<ApiResponse<{ classes: LabelClass[] }>>(`/projects/${projectId}/classes`),

  create: (projectId: string, data: { name: string; colorHex?: string }) =>
    api.post<ApiResponse<{ classId: string }>>(`/projects/${projectId}/classes`, data),

  delete: (projectId: string, classId: string) =>
    api.delete(`/projects/${projectId}/classes/${classId}`),
};

// Images API
export const imagesApi = {
  list: (datasetId: string, params?: { page?: number; pageSize?: number }) =>
    api.get<ApiResponse<PaginatedResponse<Image>>>(`/datasets/${datasetId}/images`, { params }),

  get: (id: string) => api.get<ApiResponse<{ image: Image; url: string }>>(`/images/${id}`),

  getUploadUrl: (datasetId: string, data: { fileName: string; mimeType: string }) =>
    api.post<ApiResponse<{ uploadUrl: string; fileKey: string }>>(
      `/datasets/${datasetId}/images/upload-url`,
      data
    ),

  commit: (
    datasetId: string,
    data: {
      fileKey: string;
      fileName: string;
      mimeType: string;
      width: number;
      height: number;
      sha256: string;
    }
  ) =>
    api.post<ApiResponse<{ imageId: string; isDuplicate: boolean }>>(
      `/datasets/${datasetId}/images/commit`,
      data
    ),

  delete: (id: string) => api.delete(`/images/${id}`),
};

// Annotations API
export const annotationsApi = {
  list: (imageId: string) =>
    api.get<ApiResponse<{ annotations: Annotation[] }>>(`/images/${imageId}/annotations`),

  create: (
    imageId: string,
    data: { labelClassId: string; x: number; y: number; width: number; height: number }
  ) => api.post<ApiResponse<{ annotationId: string }>>(`/images/${imageId}/annotations`, data),

  update: (id: string, data: Partial<Annotation>) =>
    api.patch<ApiResponse<Annotation>>(`/annotations/${id}`, data),

  delete: (id: string) => api.delete(`/annotations/${id}`),

  bulkUpdate: (data: { annotationIds: string[]; status: string }) =>
    api.post<ApiResponse<{ updated: number }>>('/annotations/bulk-update', data),
};

// Jobs API
export const jobsApi = {
  createAutoAnnotation: (
    datasetId: string,
    data: { className: string; confidenceThreshold?: number }
  ) =>
    api.post<ApiResponse<{ jobId: string; status: string }>>(
      `/datasets/${datasetId}/jobs/auto-annotate`,
      data
    ),

  getStatus: (id: string) =>
    api.get<
      ApiResponse<{
        jobId: string;
        status: string;
        progress: number;
        errorMessage?: string;
      }>
    >(`/jobs/${id}`),

  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),
};

// Exports API
export const exportsApi = {
  create: (datasetId: string, data: { format: string }) =>
    api.post<ApiResponse<{ jobId: string }>>(`/datasets/${datasetId}/exports`, data),

  getDownload: (id: string) =>
    api.get<ApiResponse<{ downloadUrl: string; expiresAt: string }>>(`/exports/${id}/download`),

  list: (datasetId: string) =>
    api.get<ApiResponse<{ exports: Export[] }>>(`/datasets/${datasetId}/exports`),
};

// Augmentation API
export const augmentationApi = {
  getCapabilities: () =>
    api.get<ApiResponse<AugmentationCapabilities>>('/augmentation/capabilities'),

  createClassical: (
    datasetId: string,
    data: {
      transforms: { type: string; value?: number }[];
      multiplier?: number;
      imageIds?: string[];
      preserveOriginals?: boolean;
    }
  ) =>
    api.post<ApiResponse<{ jobId: string; status: string }>>(
      `/datasets/${datasetId}/augmentation/classical`,
      data
    ),

  createGenerative: (
    datasetId: string,
    data: {
      variationType: string;
      prompt?: string;
      quantity?: number;
      imageIds?: string[];
    }
  ) =>
    api.post<
      ApiResponse<{
        jobId: string;
        status: string;
        estimate: { credits: number; estimatedUSD: number };
      }>
    >(`/datasets/${datasetId}/augmentation/generative`, data),

  preview: (
    imageId: string,
    transforms: { type: string; value?: number }[]
  ) =>
    api.post<
      ApiResponse<{
        preview: string;
        previewWidth: number;
        previewHeight: number;
        originalWidth: number;
        originalHeight: number;
        annotations: TransformedAnnotation[];
        validAnnotationCount: number;
        invalidAnnotationCount: number;
      }>
    >(`/images/${imageId}/augmentation/preview`, { transforms }),
};

export interface AugmentationCapabilities {
  classical: {
    enabled: boolean;
    transforms: {
      type: string;
      name: string;
      requiresValue: boolean;
      valueRange?: { min: number; max: number; default: number };
    }[];
  };
  generative: {
    enabled: boolean;
    available: boolean;
    variations: string[];
  };
}

export interface TransformedAnnotation {
  originalId: string;
  labelClassId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isValid: boolean;
}

// Types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  domainPolicy: string;
  createdAt: string;
  updatedAt: string;
  datasetCount?: number;
  imageCount?: number;
}

export interface Dataset {
  id: string;
  name: string;
  status: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  imageCount?: number;
  annotatedImageCount?: number;
  annotationCount?: number;
}

export interface LabelClass {
  id: string;
  projectId: string;
  name: string;
  colorHex: string;
  createdAt: string;
}

export interface Image {
  id: string;
  datasetId: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  isSynthetic: boolean;
  createdAt: string;
  url?: string;
  annotations?: Annotation[];
  annotationCount?: number;
}

export interface Annotation {
  id: string;
  imageId: string;
  labelClassId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'manual' | 'auto';
  status: 'draft' | 'approved' | 'rejected';
  confidence: number | null;
  labelClass?: LabelClass;
}

export interface Export {
  id: string;
  jobId: string;
  format: string;
  fileSizeBytes: number;
  expiresAt: string;
  createdAt: string;
  job?: {
    status: string;
    progress: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
