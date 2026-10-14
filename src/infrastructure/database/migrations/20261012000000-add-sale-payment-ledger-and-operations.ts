import { MigrationInterface, QueryRunner } from "typeorm";
import { SALE_ORDER_PERMISSIONS } from "src/modules/sale-orders/application/constants/sale-order-permissions";

/** Additive financial foundation for the customer payment lifecycle. */
export class AddSalePaymentLedgerAndOperations20261012000000 implements MigrationInterface {
  name = "AddSalePaymentLedgerAndOperations20261012000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS payment_date date,
        ADD COLUMN IF NOT EXISTS created_by_user_id uuid NULL,
        ADD COLUMN IF NOT EXISTS updated_by_user_id uuid NULL,
        ADD COLUMN IF NOT EXISTS posted_by_user_id uuid NULL,
        ADD COLUMN IF NOT EXISTS cancelled_by_user_id uuid NULL,
        ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS reversed_by_user_id uuid NULL,
        ADD COLUMN IF NOT EXISTS reversed_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS corrected_from_payment_id uuid NULL,
        ADD COLUMN IF NOT EXISTS reentered_from_payment_id uuid NULL,
        ADD COLUMN IF NOT EXISTS financial_reason text NULL;
      ALTER TABLE sale_orders
        ADD COLUMN IF NOT EXISTS currency currency_type NOT NULL DEFAULT 'PEN';
      DROP INDEX IF EXISTS uq_sale_payments_operation_number_normalized;
      CREATE UNIQUE INDEX uq_sale_payments_operation_number_normalized
        ON sale_payments (LOWER(BTRIM(operation_number)))
        WHERE operation_number IS NOT NULL AND BTRIM(operation_number) <> ''
          AND status IN ('PENDING_CONFIRMATION','POSTED');
      UPDATE sale_payments
      SET payment_date = COALESCE(payment_date, (date AT TIME ZONE 'America/Lima')::date)
      WHERE payment_date IS NULL;
      UPDATE sale_payments sp
      SET created_by_user_id = so.created_by
      FROM sale_orders so
      WHERE sp.sale_order_id = so.id AND sp.created_by_user_id IS NULL;
      ALTER TABLE sale_payments ALTER COLUMN payment_date SET NOT NULL;
      DO $$ BEGIN
        ALTER TABLE sale_payments ADD CONSTRAINT fk_sale_payments_corrected_from
          FOREIGN KEY (corrected_from_payment_id) REFERENCES sale_payments(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE sale_payments ADD CONSTRAINT fk_sale_payments_reentered_from
          FOREIGN KEY (reentered_from_payment_id) REFERENCES sale_payments(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ DECLARE fk_name text;
      BEGIN
        SELECT conname INTO fk_name
        FROM pg_constraint
        WHERE conrelid = 'sale_payments'::regclass
          AND contype = 'f'
          AND confrelid = 'sale_orders'::regclass
        LIMIT 1;
        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE sale_payments DROP CONSTRAINT %I', fk_name);
        END IF;
        ALTER TABLE sale_payments ADD CONSTRAINT fk_sale_payments_sale_order_restrict
          FOREIGN KEY (sale_order_id) REFERENCES sale_orders(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS financial_operation_references (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        normalized_reference varchar(120) NOT NULL,
        operation_type varchar(24) NOT NULL,
        payment_id uuid NULL REFERENCES sale_payments(id) ON DELETE RESTRICT,
        refund_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_financial_operation_reference_type CHECK (operation_type IN ('INCOME','REFUND')),
        CONSTRAINT chk_financial_operation_reference_target CHECK (num_nonnulls(payment_id, refund_id) = 1)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_operation_reference_normalized
        ON financial_operation_references (lower(btrim(normalized_reference)));
      INSERT INTO financial_operation_references (normalized_reference, operation_type, payment_id)
      SELECT DISTINCT ON (lower(btrim(operation_number))) btrim(operation_number), 'INCOME', id
      FROM sale_payments
      WHERE NULLIF(btrim(operation_number), '') IS NOT NULL
      ORDER BY lower(btrim(operation_number)), created_at, id
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS financial_account_movements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_payment_account_id uuid NOT NULL REFERENCES company_payment_accounts(company_payment_account_id) ON DELETE RESTRICT,
        sale_payment_id uuid NULL REFERENCES sale_payments(id) ON DELETE RESTRICT,
        refund_id uuid NULL,
        reverses_movement_id uuid NULL REFERENCES financial_account_movements(id) ON DELETE RESTRICT,
        movement_type varchar(24) NOT NULL,
        amount numeric(14,2) NOT NULL,
        currency currency_type NOT NULL,
        operation_date date NOT NULL,
        created_by_user_id uuid NULL,
        reason text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_financial_account_movement_type CHECK (movement_type IN ('INCOME','REVERSAL','REFUND','REFUND_REVERSAL')),
        CONSTRAINT chk_financial_account_movement_nonzero CHECK (amount <> 0),
        CONSTRAINT chk_financial_account_movement_target CHECK (num_nonnulls(sale_payment_id, refund_id) = 1)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_account_movements_payment_type
        ON financial_account_movements (sale_payment_id, movement_type)
        WHERE sale_payment_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_account_movements_refund_type
        ON financial_account_movements (refund_id, movement_type)
        WHERE refund_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_financial_account_movements_account_date
        ON financial_account_movements (company_payment_account_id, operation_date, currency);

      WITH ordered AS (
        SELECT sp.id, sp.sale_order_id, sp.company_payment_account_id, sp.amount, sp.currency,
               sp.payment_date, so.client_id, so.total,
               COALESCE(SUM(sp.amount) OVER (
                 PARTITION BY sp.sale_order_id ORDER BY sp.created_at, sp.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
               ), 0) AS collected_before
        FROM sale_payments sp
        INNER JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE sp.status = 'POSTED'
      ), applied AS (
        SELECT *, LEAST(amount, GREATEST(total - collected_before, 0)) AS applied_amount
        FROM ordered
      )
      INSERT INTO financial_account_movements
        (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
      SELECT company_payment_account_id, id, 'INCOME', amount, currency, payment_date, NULL, 'Backfill de ingresos contabilizados históricos'
      FROM applied a
      WHERE company_payment_account_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM company_payment_accounts cpa WHERE cpa.company_payment_account_id = a.company_payment_account_id)
        AND NOT EXISTS (SELECT 1 FROM financial_account_movements fam WHERE fam.sale_payment_id = a.id AND fam.movement_type = 'INCOME')
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS sale_payment_allocations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_payment_id uuid NOT NULL REFERENCES sale_payments(id) ON DELETE RESTRICT,
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE RESTRICT,
        amount numeric(14,2) NOT NULL CHECK (amount <> 0),
        currency currency_type NOT NULL,
        created_by_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_sale_payment_allocations_payment ON sale_payment_allocations (sale_payment_id);
      CREATE INDEX IF NOT EXISTS idx_sale_payment_allocations_order ON sale_payment_allocations (sale_order_id);

      WITH ordered AS (
        SELECT sp.id, sp.sale_order_id, sp.amount, sp.currency, so.total, so.client_id,
               COALESCE(SUM(sp.amount) OVER (
                 PARTITION BY sp.sale_order_id ORDER BY sp.created_at, sp.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
               ), 0) AS collected_before
        FROM sale_payments sp
        INNER JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE sp.status = 'POSTED'
      ), applied AS (
        SELECT *, LEAST(amount, GREATEST(total - collected_before, 0)) AS applied_amount
        FROM ordered
      )
      INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency)
      SELECT id, sale_order_id, applied_amount, currency FROM applied
      WHERE applied_amount > 0
        AND NOT EXISTS (SELECT 1 FROM sale_payment_allocations spa WHERE spa.sale_payment_id = applied.id);

      CREATE TABLE IF NOT EXISTS customer_credit_movements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        sale_payment_id uuid NULL REFERENCES sale_payments(id) ON DELETE RESTRICT,
        source_sale_order_id uuid NULL REFERENCES sale_orders(id) ON DELETE RESTRICT,
        target_sale_order_id uuid NULL REFERENCES sale_orders(id) ON DELETE RESTRICT,
        movement_type varchar(24) NOT NULL,
        amount numeric(14,2) NOT NULL CHECK (amount <> 0),
        currency currency_type NOT NULL,
        created_by_user_id uuid NULL,
        reason text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_customer_credit_movement_type CHECK (movement_type IN ('CREDIT','APPLY','RELEASE','REFUND'))
      );
      CREATE INDEX IF NOT EXISTS idx_customer_credit_movements_client_currency
        ON customer_credit_movements (client_id, currency, created_at);

      WITH ordered AS (
        SELECT sp.id, sp.sale_order_id, sp.amount, sp.currency, so.total, so.client_id,
               COALESCE(SUM(sp.amount) OVER (
                 PARTITION BY sp.sale_order_id ORDER BY sp.created_at, sp.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
               ), 0) AS collected_before
        FROM sale_payments sp
        INNER JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE sp.status = 'POSTED'
      ), applied AS (
        SELECT *, amount - LEAST(amount, GREATEST(total - collected_before, 0)) AS excess_amount
        FROM ordered
      )
      INSERT INTO customer_credit_movements
        (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, reason)
      SELECT client_id, id, sale_order_id, 'CREDIT', excess_amount, currency, 'Backfill de excedente histórico'
      FROM applied a
      WHERE excess_amount > 0
        AND NOT EXISTS (SELECT 1 FROM customer_credit_movements ccm WHERE ccm.sale_payment_id = a.id AND ccm.movement_type = 'CREDIT');

      CREATE TABLE IF NOT EXISTS customer_refunds (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_payment_id uuid NOT NULL REFERENCES sale_payments(id) ON DELETE RESTRICT,
        client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        company_payment_account_id uuid NULL REFERENCES company_payment_accounts(company_payment_account_id) ON DELETE RESTRICT,
        amount numeric(14,2) NOT NULL CHECK (amount > 0),
        currency currency_type NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'PENDING',
        operation_number varchar(120) NULL,
        reason text NOT NULL,
        created_by_user_id uuid NOT NULL,
        posted_by_user_id uuid NULL,
        posted_at timestamptz NULL,
        reversed_by_user_id uuid NULL,
        reversed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_customer_refunds_status CHECK (status IN ('PENDING','POSTED','CANCELLED','REVERSED'))
      );
      CREATE INDEX IF NOT EXISTS idx_customer_refunds_payment ON customer_refunds (sale_payment_id, status);
      DO $$ BEGIN
        ALTER TABLE financial_operation_references ADD CONSTRAINT fk_financial_operation_reference_refund
          FOREIGN KEY (refund_id) REFERENCES customer_refunds(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE financial_account_movements ADD CONSTRAINT fk_financial_account_movements_refund
          FOREIGN KEY (refund_id) REFERENCES customer_refunds(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE OR REPLACE FUNCTION register_customer_refund_operation_reference()
      RETURNS trigger AS $$
      DECLARE normalized varchar(120);
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.operation_number IS DISTINCT FROM NEW.operation_number THEN
          DELETE FROM financial_operation_references
          WHERE refund_id = NEW.id AND operation_type = 'REFUND';
        END IF;
        normalized := NULLIF(lower(btrim(NEW.operation_number)), '');
        IF normalized IS NULL THEN RETURN NEW; END IF;
        INSERT INTO financial_operation_references (normalized_reference, operation_type, refund_id)
        VALUES (normalized, 'REFUND', NEW.id);
        RETURN NEW;
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'El número de operación ya está registrado'
          USING ERRCODE = '23505', CONSTRAINT = 'uq_financial_operation_reference_normalized';
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_customer_refunds_operation_reference ON customer_refunds;
      CREATE TRIGGER trg_customer_refunds_operation_reference
        BEFORE INSERT OR UPDATE OF operation_number ON customer_refunds
        FOR EACH ROW EXECUTE FUNCTION register_customer_refund_operation_reference();

      CREATE OR REPLACE FUNCTION register_sale_payment_operation_reference()
      RETURNS trigger AS $$
      DECLARE normalized varchar(120);
      DECLARE existing_payment uuid;
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.operation_number IS DISTINCT FROM NEW.operation_number THEN
          DELETE FROM financial_operation_references
          WHERE payment_id = NEW.id AND operation_type = 'INCOME';
        END IF;
        normalized := NULLIF(lower(btrim(NEW.operation_number)), '');
        IF normalized IS NULL THEN RETURN NEW; END IF;
        SELECT payment_id INTO existing_payment
        FROM financial_operation_references
        WHERE lower(btrim(normalized_reference)) = normalized
        LIMIT 1;
        IF existing_payment IS NOT NULL AND existing_payment <> NEW.id THEN
          IF NEW.corrected_from_payment_id = existing_payment AND EXISTS (
            SELECT 1 FROM sale_payments old_payment
            WHERE old_payment.id = existing_payment AND old_payment.status = 'REVERSED'
          ) THEN
            UPDATE financial_operation_references SET payment_id = NEW.id
            WHERE lower(btrim(normalized_reference)) = normalized;
            RETURN NEW;
          END IF;
          RAISE EXCEPTION 'El número de operación ya está registrado'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_financial_operation_reference_normalized';
        END IF;
        INSERT INTO financial_operation_references (normalized_reference, operation_type, payment_id)
        VALUES (normalized, 'INCOME', NEW.id)
        ON CONFLICT ((lower(btrim(normalized_reference)))) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_sale_payments_operation_reference ON sale_payments;
      CREATE TRIGGER trg_sale_payments_operation_reference
        BEFORE INSERT OR UPDATE OF operation_number, corrected_from_payment_id
        ON sale_payments FOR EACH ROW
        EXECUTE FUNCTION register_sale_payment_operation_reference();

      CREATE OR REPLACE FUNCTION prevent_financial_history_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'El historial financiero es inmutable'
          USING ERRCODE = '55000';
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_financial_account_movements_immutable ON financial_account_movements;
      CREATE TRIGGER trg_financial_account_movements_immutable
        BEFORE UPDATE OR DELETE ON financial_account_movements
        FOR EACH ROW EXECUTE FUNCTION prevent_financial_history_mutation();
      DROP TRIGGER IF EXISTS trg_customer_credit_movements_immutable ON customer_credit_movements;
      CREATE TRIGGER trg_customer_credit_movements_immutable
        BEFORE UPDATE OR DELETE ON customer_credit_movements
        FOR EACH ROW EXECUTE FUNCTION prevent_financial_history_mutation();
      DROP TRIGGER IF EXISTS trg_sale_payment_allocations_immutable ON sale_payment_allocations;
      CREATE TRIGGER trg_sale_payment_allocations_immutable
        BEFORE UPDATE OR DELETE ON sale_payment_allocations
        FOR EACH ROW EXECUTE FUNCTION prevent_financial_history_mutation();

      CREATE TABLE IF NOT EXISTS bank_statement_lines (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_payment_account_id uuid NOT NULL REFERENCES company_payment_accounts(company_payment_account_id) ON DELETE RESTRICT,
        bank_reference varchar(120) NOT NULL,
        operation_date date NOT NULL,
        amount numeric(14,2) NOT NULL CHECK (amount > 0),
        currency currency_type NOT NULL,
        created_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (company_payment_account_id, bank_reference)
      );
      CREATE TABLE IF NOT EXISTS bank_reconciliation_allocations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        bank_statement_line_id uuid NOT NULL REFERENCES bank_statement_lines(id) ON DELETE RESTRICT,
        sale_payment_id uuid NOT NULL REFERENCES sale_payments(id) ON DELETE RESTRICT,
        amount numeric(14,2) NOT NULL CHECK (amount > 0),
        created_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        unreconciled_by_user_id uuid NULL,
        unreconciled_at timestamptz NULL,
        unreconcile_reason text NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_payment ON bank_reconciliation_allocations (sale_payment_id);
      CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_statement ON bank_reconciliation_allocations (bank_statement_line_id);

      CREATE TABLE IF NOT EXISTS financial_idempotency_records (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        scope_key varchar(220) NOT NULL,
        idempotency_key uuid NOT NULL,
        request_hash varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'IN_PROGRESS',
        response_status integer NULL,
        response_body jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL,
        CONSTRAINT chk_financial_idempotency_status CHECK (status IN ('IN_PROGRESS','COMPLETED','FAILED')),
        UNIQUE (scope_key, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS financial_outbox_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type varchar(120) NOT NULL,
        aggregate_type varchar(80) NOT NULL,
        aggregate_id uuid NOT NULL,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz NULL,
        attempts integer NOT NULL DEFAULT 0,
        last_error text NULL
      );
      CREATE INDEX IF NOT EXISTS idx_financial_outbox_pending
        ON financial_outbox_events (occurred_at) WHERE published_at IS NULL;
    `);

    const paymentPermissions = SALE_ORDER_PERMISSIONS.filter(({ code }) =>
      code.startsWith("sale_orders.payments.") || code.startsWith("customer_credits.") || code.startsWith("customer_refunds.") || code.startsWith("income.reconciliation.") || code === "income.audit.view",
    );
    const permissionValues = paymentPermissions.map((permission) =>
      `('${permission.code.replace(/'/g, "''")}', '${permission.name.replace(/'/g, "''")}', '${permission.description.replace(/'/g, "''")}', '${permission.module}', '${permission.resource}', '${permission.action}', '${permission.type}', true)`,
    ).join(",\n");
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES ${permissionValues}
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, module = EXCLUDED.module,
        resource = EXCLUDED.resource, action = EXCLUDED.action, type = EXCLUDED.type, is_active = true
    `);
  }

  public async down(): Promise<void> {
    // Financial history is append-only; rollback is intentionally forward-only.
  }
}
