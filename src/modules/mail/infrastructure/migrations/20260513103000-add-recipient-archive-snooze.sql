ALTER TABLE message_recipients
  ADD COLUMN IF NOT EXISTS archived_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamp NULL,
  ADD COLUMN IF NOT EXISTS snoozed_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS trash_expires_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS permanently_hidden_at timestamp NULL;

CREATE INDEX IF NOT EXISTS idx_message_recipients_user_archived
ON message_recipients (recipient_user_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_message_recipients_user_snoozed
ON message_recipients (recipient_user_id, snoozed_until);
