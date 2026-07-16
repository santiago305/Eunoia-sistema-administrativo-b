import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseApprovalHistory20260506010000 implements MigrationInterface {
  name = "CreatePurchaseApprovalHistory20260506010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_doc_type') THEN
          CREATE TYPE voucher_doc_type AS ENUM ('01','03','NOTA_VENTA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_form_type') THEN
          CREATE TYPE payment_form_type AS ENUM ('CONTADO','CREDITO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
          CREATE TYPE po_status AS ENUM ('DRAFT','SENT','PARTIAL','PENDING_RECEIPT_CONFIRMATION','RECEIVED','CANCELLED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_type') THEN
          CREATE TYPE purchase_type AS ENUM ('INVENTORY','RAW_MATERIAL','INTERNAL_MATERIAL','FIXED_ASSET','SERVICE','SUBSCRIPTION','MIXED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_item_type') THEN
          CREATE TYPE purchase_item_type AS ENUM ('PRODUCT','RAW_MATERIAL','INTERNAL_MATERIAL','FIXED_ASSET','SERVICE','SUBSCRIPTION');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_reception_status') THEN
          CREATE TYPE purchase_reception_status AS ENUM ('NOT_REQUIRED','PENDING','PARTIALLY_RECEIVED','RECEIVED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_payment_status') THEN
          CREATE TYPE purchase_payment_status AS ENUM ('PENDING','PARTIAL','PAID','OVERDUE','CANCELLED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'afect_igv_type') THEN
          CREATE TYPE afect_igv_type AS ENUM ('10','20');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_doc_type') THEN
          CREATE TYPE pay_doc_type AS ENUM ('PURCHASE','SALE');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        po_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id),
        warehouse_id uuid NULL REFERENCES warehouses(id),
        document_type voucher_doc_type NULL,
        serie varchar NULL,
        correlative integer NULL,
        currency currency_type NULL,
        payment_form payment_form_type NULL,
        credit_days integer NOT NULL DEFAULT 0,
        num_quotas integer NOT NULL DEFAULT 0,
        total_taxed numeric(12,2) NOT NULL DEFAULT 0,
        total_exempted numeric(12,2) NOT NULL DEFAULT 0,
        total_igv numeric(12,2) NOT NULL DEFAULT 0,
        purchase_value numeric(12,2) NOT NULL DEFAULT 0,
        total numeric(12,2) NOT NULL,
        note text NULL,
        status po_status NOT NULL DEFAULT 'DRAFT',
        purchase_type purchase_type NOT NULL DEFAULT 'INVENTORY',
        reception_status purchase_reception_status NOT NULL DEFAULT 'PENDING',
        payment_status purchase_payment_status NOT NULL DEFAULT 'PENDING',
        requested_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        approved_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        approved_at timestamptz NULL,
        rejected_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        rejected_at timestamptz NULL,
        rejection_reason text NULL,
        is_recurring_source boolean NOT NULL DEFAULT false,
        recurring_template_id uuid NULL,
        requires_receipt boolean NOT NULL DEFAULT true,
        requires_stock_entry boolean NOT NULL DEFAULT true,
        requires_asset_creation boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        expected_at timestamptz NULL,
        date_issue timestamptz NULL,
        date_expiration timestamptz NULL,
        created_by uuid NULL REFERENCES users(user_id),
        approval_status varchar(20) NOT NULL DEFAULT 'NOT_REQUIRED',
        image_prodution jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_po_doc UNIQUE (document_type, serie, correlative)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        po_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        po_id uuid NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
        stock_item_id uuid NULL REFERENCES pc_stock_items(stock_item_id),
        item_type purchase_item_type NOT NULL DEFAULT 'PRODUCT',
        internal_material_id uuid NULL,
        asset_category_id uuid NULL,
        service_name varchar NULL,
        description text NULL,
        warehouse_id uuid NULL REFERENCES warehouses(id) ON DELETE SET NULL,
        affects_stock boolean NOT NULL DEFAULT true,
        generates_asset boolean NOT NULL DEFAULT false,
        is_service boolean NOT NULL DEFAULT false,
        is_subscription boolean NOT NULL DEFAULT false,
        unit_base varchar NULL,
        equivalence varchar NULL,
        factor numeric(12,4) NULL,
        afect_type afect_igv_type NOT NULL,
        quantity numeric(12,3) NOT NULL,
        porcentage_igv numeric NOT NULL,
        base_without_igv numeric(12,2) NOT NULL,
        amount_igv numeric(12,2) NOT NULL,
        unit_value numeric(12,4) NOT NULL,
        unit_price numeric(12,4) NOT NULL,
        purchase_value numeric(12,2) NOT NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS credit_quotas (
        quota_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        number integer NOT NULL,
        expiration_date date NOT NULL,
        payment_date timestamptz NULL,
        total_to_pay numeric(12,2) NOT NULL,
        total_paid numeric(12,2) NOT NULL DEFAULT 0,
        from_document_type pay_doc_type NOT NULL,
        po_id uuid NULL REFERENCES purchase_orders(po_id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_credit_quotas_po ON credit_quotas(po_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_documents (
        pay_doc_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        method varchar(300) NOT NULL,
        date timestamptz NOT NULL,
        operation_number varchar(60) NULL,
        currency currency_type NOT NULL,
        amount numeric(12,2) NOT NULL,
        note varchar(225) NULL,
        from_document_type pay_doc_type NOT NULL,
        po_id uuid NULL REFERENCES purchase_orders(po_id) ON DELETE SET NULL,
        quota_id uuid NULL REFERENCES credit_quotas(quota_id) ON DELETE SET NULL,
        company_payment_account_id uuid NULL,
        payment_method_id uuid NULL,
        status varchar(30) NOT NULL DEFAULT 'APPROVED',
        requested_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        approved_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        rejected_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        approved_at timestamptz NULL,
        rejected_at timestamptz NULL,
        rejection_reason text NULL,
        paid_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        scheduled_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        scheduled_at timestamptz NULL,
        paid_at timestamptz NULL,
        payment_evidence_file_id uuid NULL,
        bank_name varchar(120) NULL,
        card_last_four varchar(4) NULL,
        operation_code varchar(80) NULL,
        is_partial boolean NOT NULL DEFAULT false
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_documents_po ON payment_documents(po_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_documents_quota ON payment_documents(quota_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type varchar(80) NOT NULL,
        entity_id uuid NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'PENDING',
        requested_by uuid REFERENCES users(user_id),
        reviewed_by uuid REFERENCES users(user_id),
        reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_history_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL,
        event_type varchar(80) NOT NULL,
        description text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by uuid REFERENCES users(user_id),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_processing_approvals (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL,
        approval_request_id uuid REFERENCES approval_requests(id) ON DELETE SET NULL,
        status varchar(50) NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_history_events_purchase ON purchase_history_events(purchase_id, created_at);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
