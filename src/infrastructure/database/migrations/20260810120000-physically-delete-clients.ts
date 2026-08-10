import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhysicallyDeleteClients20260810120000
  implements MigrationInterface
{
  name = 'PhysicallyDeleteClients20260810120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM sale_orders LIMIT 1) THEN
          RAISE NOTICE 'Client cleanup skipped because sale orders exist';
        ELSE
          DELETE FROM clients;
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // La eliminacion fisica de los clientes no se puede revertir.
  }
}
