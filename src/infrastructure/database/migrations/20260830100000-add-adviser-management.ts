import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdviserManagement20260830100000 implements MigrationInterface {
  name = 'AddAdviserManagement20260830100000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "advisers" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`INSERT INTO permissions (code, name, description, module, resource, action, type, is_active) VALUES ('advisers.view','Ver asesores','Acceso a la página de asesores','advisers','advisers','view','page',true),('advisers.manage','Gestionar asesores','Crear, editar y desactivar asesores','advisers','advisers','manage','action',true) ON CONFLICT (code) DO NOTHING`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code IN ('advisers.view','advisers.manage')`);
    await queryRunner.query(`ALTER TABLE "advisers" DROP COLUMN IF EXISTS "is_active"`);
  }
}
