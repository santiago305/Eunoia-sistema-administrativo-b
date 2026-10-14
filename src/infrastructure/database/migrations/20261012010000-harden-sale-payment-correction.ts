import { MigrationInterface, QueryRunner } from "typeorm";

/** Enforce a single correction successor and keep operation references unique across incomes and refunds. */
export class HardenSalePaymentCorrection20261012010000 implements MigrationInterface {
  name = "HardenSalePaymentCorrection20261012010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_payments_corrected_from
        ON sale_payments (corrected_from_payment_id)
        WHERE corrected_from_payment_id IS NOT NULL;

      CREATE OR REPLACE FUNCTION register_sale_payment_operation_reference()
      RETURNS trigger AS $$
      DECLARE normalized varchar(120);
      DECLARE existing_payment uuid;
      DECLARE existing_type varchar(24);
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.operation_number IS DISTINCT FROM NEW.operation_number THEN
          DELETE FROM financial_operation_references
          WHERE payment_id = NEW.id AND operation_type = 'INCOME';
        END IF;
        normalized := NULLIF(lower(btrim(NEW.operation_number)), '');
        IF normalized IS NULL THEN RETURN NEW; END IF;

        SELECT operation_type, payment_id INTO existing_type, existing_payment
        FROM financial_operation_references
        WHERE lower(btrim(normalized_reference)) = normalized
        LIMIT 1;

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
        VALUES (normalized, 'INCOME', NEW.id)
        ON CONFLICT ((lower(btrim(normalized_reference)))) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // This invariant is intentionally retained during application rollback: removing it could
    // permit a second correction successor or duplicate financial operation references.
    void queryRunner;
  }
}
