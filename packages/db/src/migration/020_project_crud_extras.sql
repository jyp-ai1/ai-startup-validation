-- Mission A-1: Project CRUD extras (soft delete, pin, thumbnail)
ALTER TABLE startup_projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail_color text;

CREATE INDEX IF NOT EXISTS idx_startup_projects_deleted_at
  ON startup_projects (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_startup_projects_is_pinned
  ON startup_projects (is_pinned)
  WHERE is_pinned = true;
