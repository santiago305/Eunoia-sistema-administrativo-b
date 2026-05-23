BEGIN;

INSERT INTO mail_attachment_user_refs (
  attachment_id,
  user_id,
  message_id,
  counts_storage,
  deleted_at,
  permanently_deleted_at
)
SELECT DISTINCT
  ma.id AS attachment_id,
  mus.user_id AS user_id,
  ma.message_id AS message_id,
  CASE WHEN mus.permanently_hidden_at IS NULL THEN true ELSE false END AS counts_storage,
  CASE WHEN mus.permanently_hidden_at IS NULL THEN NULL ELSE mus.permanently_hidden_at END AS deleted_at,
  mus.permanently_hidden_at AS permanently_deleted_at
FROM message_attachments ma
INNER JOIN message_user_states mus
  ON mus.message_id = ma.message_id
ON CONFLICT (attachment_id, user_id) DO NOTHING;

COMMIT;

