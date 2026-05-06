ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS show_as_toast boolean NOT NULL DEFAULT true;

