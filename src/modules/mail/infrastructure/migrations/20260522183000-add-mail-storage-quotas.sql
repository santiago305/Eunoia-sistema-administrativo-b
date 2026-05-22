BEGIN;

CREATE TABLE IF NOT EXISTS mail_storage_quotas (
  user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  quota_bytes bigint NOT NULL,
  updated_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_attachment_user_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL REFERENCES message_attachments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
  counts_storage boolean NOT NULL DEFAULT true,
  deleted_at timestamptz NULL,
  permanently_deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_attachment_user_refs_attachment_user
  ON mail_attachment_user_refs(attachment_id, user_id);

CREATE INDEX IF NOT EXISTS idx_mail_attachment_user_refs_user_active
  ON mail_attachment_user_refs(user_id, counts_storage, permanently_deleted_at);

INSERT INTO mail_storage_quotas (user_id, quota_bytes, updated_by_user_id)
SELECT user_id, (1024::bigint * 1024 * 1024), NULL
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO mail_attachment_user_refs (
  attachment_id,
  user_id,
  message_id,
  counts_storage,
  deleted_at,
  permanently_deleted_at
)
SELECT
  ma.id,
  ma.uploaded_by_user_id,
  ma.message_id,
  true,
  NULL,
  NULL
FROM message_attachments ma
ON CONFLICT (attachment_id, user_id) DO NOTHING;

COMMIT;
