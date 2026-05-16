-- M2: El estado ARCHIVED no debe vivir en messages.status.
-- El archivado queda en message_user_states.is_archived.

UPDATE messages
SET status = 'DRAFT',
    is_draft = false,
    draft_expires_at = NULL,
    updated_at = now()
WHERE status = 'ARCHIVED';

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS chk_messages_status;

ALTER TABLE messages
  ADD CONSTRAINT chk_messages_status
  CHECK (status IN ('DRAFT', 'SENT', 'FAILED', 'SCHEDULED'));

