import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMasterSuperAdministratorRole20260527000000 implements MigrationInterface {
  name = 'AddMasterSuperAdministratorRole20260527000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // No-op: no se debe crear automaticamente el rol super_administrator.
  }

  public async down(): Promise<void> {
    // No-op para evitar perdida de trazabilidad.
  }
}
