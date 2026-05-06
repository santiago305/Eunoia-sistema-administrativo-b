ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_approval_status
  ON purchase_orders(approval_status);

