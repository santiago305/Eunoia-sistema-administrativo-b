import { MigrationInterface, QueryRunner } from "typeorm";

export class HardenBankReconciliationHistory20261012040000 implements MigrationInterface {
  name = "HardenBankReconciliationHistory20261012040000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_bank_statement_line_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Bank statement lines are immutable';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_bank_statement_lines_immutable ON bank_statement_lines;
      CREATE TRIGGER trg_bank_statement_lines_immutable
        BEFORE UPDATE OR DELETE ON bank_statement_lines
        FOR EACH ROW EXECUTE FUNCTION prevent_bank_statement_line_mutation();

      CREATE OR REPLACE FUNCTION guard_bank_reconciliation_allocation_mutation() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Bank reconciliation allocations cannot be deleted';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id
          OR NEW.bank_statement_line_id IS DISTINCT FROM OLD.bank_statement_line_id
          OR NEW.sale_payment_id IS DISTINCT FROM OLD.sale_payment_id
          OR NEW.amount IS DISTINCT FROM OLD.amount
          OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
          OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
          RAISE EXCEPTION 'Bank reconciliation allocation facts are immutable';
        END IF;
        IF OLD.unreconciled_at IS NOT NULL
          OR NEW.unreconciled_at IS NULL
          OR NEW.unreconciled_by_user_id IS NULL
          OR NEW.unreconcile_reason IS NULL
          OR length(btrim(NEW.unreconcile_reason)) < 5 THEN
          RAISE EXCEPTION 'A reconciliation allocation may only be unreconciled once with a reason';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_bank_reconciliation_allocations_guard ON bank_reconciliation_allocations;
      CREATE TRIGGER trg_bank_reconciliation_allocations_guard
        BEFORE UPDATE OR DELETE ON bank_reconciliation_allocations
        FOR EACH ROW EXECUTE FUNCTION guard_bank_reconciliation_allocation_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_bank_reconciliation_allocations_guard ON bank_reconciliation_allocations;
      DROP FUNCTION IF EXISTS guard_bank_reconciliation_allocation_mutation();
      DROP TRIGGER IF EXISTS trg_bank_statement_lines_immutable ON bank_statement_lines;
      DROP FUNCTION IF EXISTS prevent_bank_statement_line_mutation();
    `);
  }
}
