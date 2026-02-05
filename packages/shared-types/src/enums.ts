// ===========================================
// Enums - Shared across frontend and backend
// ===========================================

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
  AGENCY = 'agency',
}

export enum DomainPolicy {
  STANDARD = 'standard',
  RESTRICTED = 'restricted',
  SENSITIVE = 'sensitive',
}

export enum DatasetStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum AnnotationSource {
  MANUAL = 'manual',
  AUTO = 'auto',
}

export enum AnnotationStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum JobType {
  AUTO_ANNOTATION = 'auto_annotation',
  CLASSICAL_AUGMENTATION = 'classical_augmentation',
  GENERATIVE_AUGMENTATION = 'generative_augmentation',
  EXPORT = 'export',
}

export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum ExportFormat {
  COCO = 'coco',
  YOLO = 'yolo',
  VOC = 'voc',
}

export enum SyntheticSource {
  CLASSICAL = 'classical',
  GENERATIVE = 'generative',
}
