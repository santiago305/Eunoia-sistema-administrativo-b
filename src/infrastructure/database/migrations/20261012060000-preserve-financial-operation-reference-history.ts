import { MigrationInterface, QueryRunner } from "typeorm";

/** Keep every previously used payment/refund reference reserved after edits. */
export class PreserveFinancialOperationReferenceHistory20261012060000 implements MigrationInterface {
  name = "PreserveFinancialOperationReferenceHistory20261012060000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION register_customer_refund_operation_reference()
      RETURNS trigger AS $$
      DECLARE normalized varchar(120);
      DECLARE existing_type varchar(24);
      DECLARE existing_refund uuid;
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.operation_number IS NOT DISTINCT FROM NEW.operation_number THEN
          RETURN NEW;
        END IF;
        normalized := NULLIF(lower(btrim(NEW.operation_number)), '');
        IF normalized IS NULL THEN RETURN NEW; END IF;

        SELECT operation_type, refund_id INTO existing_type, existing_refund
        FROM financial_operation_references
        WHERE lower(btrim(normalized_reference)) = normalized
        FOR UPDATE;
        IF existing_type IS NOT NULL THEN
          IF existing_type = 'REFUND' AND existing_refund = NEW.id THEN RETURN NEW; END IF;
          RAISE EXCEPTION 'El número de operación ya está registrado'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_financial_operation_reference_normalized';
        END IF;

        INSERT INTO financial_operation_references (normalized_reference, operation_type, refund_id)
        VALUES (normalized, 'REFUND', NEW.id);
        RETURN NEW;
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'El número de operación ya está registrado'
          USING ERRCODE = '23505', CONSTRAINT = 'uq_financial_operation_reference_normalized';
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION register_sale_payment_operation_reference()
      RETURNS trigger AS $$
      DECLARE normalized varchar(120);
      DECLARE existing_type varchar(24);
      DECLARE existing_payment uuid;
      BEGIN
        IF TG_OP = 'UPDATE'
           AND OLD.operation_number IS NOT DISTINCT FROM NEW.operation_number
           AND OLD.corrected_from_payment_id IS NOT DISTINCT FROM NEW.corrected_from_payment_id THEN
          RETURN NEW;
        END IF;
        normalized := NULLIF(lower(btrim(NEW.operation_number)), '');
        IF normalized IS NULL THEN RETURN NEW; END IF;

        SELECT operation_type, payment_id INTO existing_type, existing_payment
        FROM financial_operation_references
        WHERE lower(btrim(normalized_reference)) = normalized
        FOR UPDATE;
        IF existing_type IS NOT NULL THEN
          IF existing_type = 'INCOME' AND existing_payment = NEW.id THEN RETURN NEW; END IF;
          IF existing_type = 'INCOME'
             AND NEW.corrected_from_payment_id = existing_payment
             AND EXISTS (
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
        VALUES (normalized, 'INCOME', NEW.id);
        RETURN NEW;
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'El número de operación ya está registrado'
          USING ERRCODE = '23505', CONSTRAINT = 'uq_financial_operation_reference_normalized';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_customer_refunds_operation_reference ON customer_refunds;
      CREATE TRIGGER trg_customer_refunds_operation_reference
        AFTER INSERT OR UPDATE OF operation_number ON customer_refunds
        FOR EACH ROW EXECUTE FUNCTION register_customer_refund_operation_reference();
      DROP TRIGGER IF EXISTS trg_sale_payments_operation_reference ON sale_payments;
      CREATE TRIGGER trg_sale_payments_operation_reference
        AFTER INSERT OR UPDATE OF operation_number, corrected_from_payment_id
        ON sale_payments FOR EACH ROW
        EXECUTE FUNCTION register_sale_payment_operation_reference();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Do not restore the old behavior: it releases operation numbers already used in history.
    void queryRunner;
  }
}
