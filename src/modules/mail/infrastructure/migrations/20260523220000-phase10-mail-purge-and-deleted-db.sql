BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

UPDATE users
SET deleted_at = COALESCE(deleted_at, updated_at, created_at, now())
WHERE deleted = true
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted_deleted_at
  ON users (deleted, deleted_at);

COMMIT;

