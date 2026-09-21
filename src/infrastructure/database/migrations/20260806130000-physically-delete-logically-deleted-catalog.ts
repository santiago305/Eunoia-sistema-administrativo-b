import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhysicallyDeleteLogicallyDeletedCatalog20260806130000
  implements MigrationInterface
{
  name = 'PhysicallyDeleteLogicallyDeletedCatalog20260806130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        RAISE NOTICE 'Logical catalog cleanup skipped to preserve historical data; run a reviewed cleanup separately.';
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // La limpieza fisica de datos de prueba no se puede revertir.
  }
}
