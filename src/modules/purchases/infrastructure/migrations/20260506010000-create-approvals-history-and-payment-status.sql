CREATE TABLE IF NOT EXISTS approval_requests (
  approval_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module varchar(80) NOT NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid NOT NULL,
  requested_by_user_id uuid NOT NULL,
  reviewed_by_user_id uuid NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  payload_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
  ON approval_requests(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON approval_requests(status);

CREATE TABLE IF NOT EXISTS purchase_history_events (
  purchase_history_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  event_type varchar(120) NOT NULL,
  description text NOT NULL,
  old_values jsonb NULL,
  new_values jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by_user_id uuid NULL,
  target_user_id uuid NULL,
  approval_request_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_history_events_purchase
  ON purchase_history_events(purchase_id, created_at);

ALTER TABLE payment_documents
  ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS requested_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS approved_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS rejected_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

CREATE INDEX IF NOT EXISTS idx_payment_documents_status
  ON payment_documents(status);

