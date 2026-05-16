CREATE TABLE IF NOT EXISTS notification_module_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(60) NOT NULL UNIQUE,
  label_id UUID NULL REFERENCES message_labels(id) ON DELETE SET NULL,
  updated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_module_label_configs_label_id
  ON notification_module_label_configs(label_id);
