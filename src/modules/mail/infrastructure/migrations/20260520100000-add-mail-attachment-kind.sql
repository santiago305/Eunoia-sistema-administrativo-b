ALTER TABLE message_attachments
  ADD COLUMN IF NOT EXISTS attachment_kind varchar(20) NOT NULL DEFAULT 'file';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_attachments_kind'
  ) THEN
    ALTER TABLE message_attachments
      ADD CONSTRAINT chk_message_attachments_kind
      CHECK (attachment_kind IN ('file', 'image'));
  END IF;
END $$;
