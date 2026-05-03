CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(80) NOT NULL,
  category varchar(80) NOT NULL,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  priority varchar(20) NOT NULL DEFAULT 'NORMAL',
  source_module varchar(60) NULL,
  source_entity_type varchar(60) NULL,
  source_entity_id varchar(120) NULL,
  action_url varchar(255) NULL,
  action_label varchar(120) NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'UNREAD',
  seen_at timestamp NULL,
  read_at timestamp NULL,
  delivered_at timestamp NULL,
  archived_at timestamp NULL,
  dismissed_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient_user_status_created
ON notification_recipients (recipient_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_recipient_user_read
ON notification_recipients (recipient_user_id, read_at);
