// ===========================================
// API Types - Request/Response contracts
// ===========================================

import { DomainPolicy, AnnotationStatus, ExportFormat, JobStatus } from './enums';
import {
  User,
  UserPublic,
  ProjectWithStats,
  DatasetWithStats,
  LabelClass,
  ImageWithAnnotations,
  AnnotationWithClass,
} from './entities';

// ===========================================
// Base Response Types
// ===========================================

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===========================================
// Authentication
// ===========================================

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  emailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: UserPublic;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface LogoutRequest {
  refreshToken: string;
}

// ===========================================
// Projects
// ===========================================

export interface CreateProjectRequest {
  name: string;
  description?: string;
  domainPolicy?: DomainPolicy;
}

export interface CreateProjectResponse {
  projectId: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  domainPolicy?: DomainPolicy;
}

export interface ProjectListResponse {
  projects: ProjectWithStats[];
}

export interface ProjectResponse {
  project: ProjectWithStats;
  labelClasses: LabelClass[];
  datasets: DatasetWithStats[];
}

// ===========================================
// Datasets
// ===========================================

export interface CreateDatasetRequest {
  name: string;
}

export interface CreateDatasetResponse {
  datasetId: string;
}

export interface DatasetResponse {
  dataset: DatasetWithStats;
  labelClasses: LabelClass[];
}

// ===========================================
// Label Classes
// ===========================================

export interface CreateLabelClassRequest {
  name: string;
  colorHex?: string;
}

export interface CreateLabelClassResponse {
  classId: string;
}

export interface LabelClassListResponse {
  classes: LabelClass[];
}

// ===========================================
// Images
// ===========================================

export interface GetUploadUrlRequest {
  fileName: string;
  mimeType: string;
}

export interface GetUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface CommitImageRequest {
  fileKey: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sha256: string;
  phash?: string;
}

export interface CommitImageResponse {
  imageId: string;
  isDuplicate: boolean;
}

export interface ImageListQuery {
  page?: number;
  pageSize?: number;
  isSynthetic?: boolean;
  hasAnnotations?: boolean;
}

export interface ImageListResponse extends PaginatedResponse<ImageWithAnnotations> {}

export interface ImageResponse {
  image: ImageWithAnnotations;
  url: string;
}

// ===========================================
// Annotations
// ===========================================

export interface CreateAnnotationRequest {
  labelClassId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateAnnotationResponse {
  annotationId: string;
}

export interface UpdateAnnotationRequest {
  labelClassId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  status?: AnnotationStatus;
}

export interface BulkUpdateAnnotationsRequest {
  annotationIds: string[];
  status: AnnotationStatus;
}

export interface AnnotationListResponse {
  annotations: AnnotationWithClass[];
}

// ===========================================
// Jobs
// ===========================================

export interface CreateAutoAnnotationJobRequest {
  className: string;
  confidenceThreshold?: number;
  imageIds?: string[]; // Optional: specific images, default all
}

export interface CreateAutoAnnotationJobResponse {
  jobId: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  jobId: string;
  jobType: string;
  status: JobStatus;
  progress: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

// ===========================================
// Exports
// ===========================================

export interface CreateExportRequest {
  format: ExportFormat;
  includeImages?: boolean;
  annotationStatus?: AnnotationStatus[];
}

export interface CreateExportResponse {
  jobId: string;
}

export interface ExportDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
  fileSizeBytes: number;
}

// ===========================================
// User
// ===========================================

export interface GetCurrentUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  fullName?: string;
}
