import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds an immutable company owner to every sale order before financial scoping is enforced. */
export class AddSaleOrderCompanyScope20261016000000 implements MigrationInterface {
  name = 'AddSaleOrderCompanyScope20261016000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
        ADD COLUMN IF NOT EXISTS company_id uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_orders_company_id
        ON sale_orders (company_id)
    `);

    const conflicts = await queryRunner.query(`
      SELECT so.id
        FROM sale_orders so
        LEFT JOIN users creator ON creator.user_id = so.created_by
        LEFT JOIN sale_payments payment ON payment.sale_order_id = so.id
        LEFT JOIN company_payment_accounts account
          ON account.company_payment_account_id = payment.company_payment_account_id
       WHERE so.company_id IS NULL
       GROUP BY so.id, creator.company_id
      HAVING COUNT(DISTINCT account.company_id) > 1
          OR (
            COUNT(DISTINCT account.company_id) = 1
            AND creator.company_id IS NOT NULL
            AND BOOL_OR(account.company_id IS DISTINCT FROM creator.company_id)
          )
    `);
    if (conflicts.length) {
      throw new Error(
        `No se puede asignar compañía a ${conflicts.length} pedidos con datos financieros cruzados`,
      );
    }

    await queryRunner.query(`
      WITH active_company AS (
        SELECT company_id
          FROM companies candidate
         WHERE candidate.is_active = true
           AND (
             SELECT COUNT(*)
               FROM companies active
              WHERE active.is_active = true
           ) = 1
      ), payment_company AS (
        SELECT payment.sale_order_id, MIN(account.company_id) AS company_id
          FROM sale_payments payment
          JOIN company_payment_accounts account
            ON account.company_payment_account_id = payment.company_payment_account_id
         GROUP BY payment.sale_order_id
        HAVING COUNT(DISTINCT account.company_id) = 1
      )
      UPDATE sale_orders so
         SET company_id = COALESCE(
           (
             SELECT payment_company.company_id
               FROM payment_company
              WHERE payment_company.sale_order_id = so.id
           ),
           (SELECT company_id FROM users creator WHERE creator.user_id = so.created_by),
           (SELECT company_id FROM active_company)
         )
       WHERE so.company_id IS NULL
    `);

    const unresolved = await queryRunner.query(`
      SELECT COUNT(*)::int AS total
        FROM sale_orders
       WHERE company_id IS NULL
    `);
    if (Number(unresolved[0]?.total ?? 0) > 0) {
      throw new Error(
        'No se puede hacer obligatorio sale_orders.company_id: existen pedidos sin compañía determinable',
      );
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_sale_orders_company'
        ) THEN
          ALTER TABLE sale_orders
            ADD CONSTRAINT fk_sale_orders_company
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
            ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE sale_orders
        ALTER COLUMN company_id SET NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
        DROP CONSTRAINT IF EXISTS fk_sale_orders_company
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_sale_orders_company_id
    `);
    await queryRunner.query(`
      ALTER TABLE sale_orders
        DROP COLUMN IF EXISTS company_id
    `);
  }
}
