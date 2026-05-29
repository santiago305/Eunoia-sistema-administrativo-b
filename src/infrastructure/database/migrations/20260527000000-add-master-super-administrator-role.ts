import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMasterSuperAdministratorRole20260527000000 implements MigrationInterface {
  name = 'AddMasterSuperAdministratorRole20260527000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (description, deleted)
      SELECT 'super_administrator', false
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE description = 'super_administrator'
      );
    `);

    await queryRunner.query(`
      UPDATE users
      SET role_id = role_master.role_id
      FROM roles role_master
      WHERE role_master.description = 'super_administrator'
        AND users.is_super_admin = true
        AND users.role_id IS DISTINCT FROM role_master.role_id;
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar perdida de trazabilidad.
  }
}
