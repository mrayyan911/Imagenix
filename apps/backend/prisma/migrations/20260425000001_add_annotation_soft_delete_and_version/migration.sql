-- Migration: add_annotation_soft_delete_and_version
-- Adds soft delete (deleted_at) and optimistic locking (version) to annotations table.
-- Safe: all existing rows will have version=1 and deleted_at=NULL.

ALTER TABLE "annotations"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "annotations_deleted_at_idx" ON "annotations"("deleted_at");
