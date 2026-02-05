// ===========================================
// Entity Types - Database model representations
// ===========================================

import {
  UserRole,
  UserPlan,
  DomainPolicy,
  DatasetStatus,
  AnnotationSource,
  AnnotationStatus,
  JobType,
  JobStatus,
  ExportFormat,
  SyntheticSource,
} from './enums';

// ===========================================
// User
// ===========================================

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  emailVerified: boolean;
  plan: UserPlan;
  planExpiresAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  plan: UserPlan;
}

// ===========================================
// Session
// ===========================================

export interface Session {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Project
// ===========================================

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  domainPolicy: DomainPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithStats extends Project {
  datasetCount: number;
  imageCount: number;
  annotationCount: number;
}

// ===========================================
// Dataset
// ===========================================

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  status: DatasetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatasetWithStats extends Dataset {
  imageCount: number;
  annotatedImageCount: number;
  annotationCount: number;
  syntheticImageCount: number;
}

// ===========================================
// Label Class
// ===========================================

export interface LabelClass {
  id: string;
  projectId: string;
  name: string;
  colorHex: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Image
// ===========================================

export interface Image {
  id: string;
  datasetId: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sha256: string;
  phash: string | null;
  isSynthetic: boolean;
  syntheticSource: SyntheticSource | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageWithAnnotations extends Image {
  annotations: Annotation[];
  annotationCount: number;
}

export interface ImageWithUrl extends Image {
  url: string;
  thumbnailUrl?: string;
}

// ===========================================
// Annotation
// ===========================================

export interface Annotation {
  id: string;
  imageId: string;
  labelClassId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source: AnnotationSource;
  status: AnnotationStatus;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationWithClass extends Annotation {
  labelClass: LabelClass;
}

// ===========================================
// Dataset Version
// ===========================================

export interface DatasetVersion {
  id: string;
  datasetId: string;
  name: string;
  parentVersionId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Job
// ===========================================

export interface Job {
  id: string;
  userId: string;
  datasetId: string;
  jobType: JobType;
  status: JobStatus;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Export
// ===========================================

export interface Export {
  id: string;
  jobId: string;
  format: ExportFormat;
  fileKey: string;
  fileSizeBytes: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportWithDownload extends Export {
  downloadUrl: string;
}
