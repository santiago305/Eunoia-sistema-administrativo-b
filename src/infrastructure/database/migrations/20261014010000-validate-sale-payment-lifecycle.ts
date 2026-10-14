import { MigrationInterface, QueryRunner } from "typeorm";

const canonicalPaymentStatuses = [
  "PENDING_CONFIRMATION",
  "POSTED",
  "CANCELLED",
  "REVERSED",
] as const;

type UnsupportedStatusRow = { status: string | null; total: number };
type LifecycleConstraintRow = { definition: string; validated: boolean };

export class ValidateSalePaymentLifecycle20261014010000 implements MigrationInterface {
  name = "ValidateSalePaymentLifecycle20261014010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const unsupported: UnsupportedStatusRow[] = await queryRunner.query(`
      SELECT status, COUNT(*)::int AS total
      FROM sale_payments
      WHERE status IS NULL
         OR status NOT IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED')
      GROUP BY status
      ORDER BY status
    `);
    if (unsupported.length) {
      const summary = unsupported.map(({ status, total }) => `${status ?? "NULL"}=${total}`).join(", ");
      throw new Error(
        `Migration stopped: classify unsupported sale-payment lifecycle states before validating the constraint (${summary}).`,
      );
    }

    const constraints: LifecycleConstraintRow[] = await queryRunner.query(`
      SELECT pg_get_constraintdef(oid) AS definition, convalidated AS validated
      FROM pg_constraint
      WHERE conrelid = 'sale_payments'::regclass
        AND conname = 'chk_sale_payments_lifecycle_status'
    `);
    const constraint = constraints[0];
    if (!constraint) {
      throw new Error("Migration stopped: chk_sale_payments_lifecycle_status is missing; restore the canonical lifecycle constraint before validating it.");
    }

    const definition = constraint.definition.toUpperCase();
    const missingStatuses = canonicalPaymentStatuses.filter((status) => !definition.includes(status));
    if (missingStatuses.length) {
      throw new Error(
        `Migration stopped: chk_sale_payments_lifecycle_status does not allow every canonical state (${missingStatuses.join(", " )}).`,
      );
    }

    if (!constraint.validated) {
      await queryRunner.query(`ALTER TABLE sale_payments VALIDATE CONSTRAINT chk_sale_payments_lifecycle_status`);
    }
  }

  async down(): Promise<void> {
    // Validation is intentionally irreversible: lifecycle enforcement must remain active.
  }
}
