CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_recipient_id uuid NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  attempts int NOT NULL DEFAULT 0,
  next_retry_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_recipient_id uuid NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL,
  status varchar(20) NOT NULL,
  attempt_number int NOT NULL,
  error_message text NULL,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_next_retry
ON notification_outbox (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_created_at
ON notification_outbox (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_recipient_created
ON notification_delivery_attempts (notification_recipient_id, created_at DESC);
