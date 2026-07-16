import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseApprovalHistory20260506010000 implements MigrationInterface {
  name = "CreatePurchaseApprovalHistory20260506010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
