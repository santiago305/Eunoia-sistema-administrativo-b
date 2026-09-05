import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdviserPermissions20260905090000 implements MigrationInterface {
  name = 'AddAdviserPermissions20260905090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (
        code,
        name,
        description,
        module,
        resource,
        action,
        type,
        is_active
      )
      VALUES
        (
          'page.advisers.view',
          'Ver asesores',
          'Acceso a la pantalla de asesores',
          'advisers',
          'advisers',
          'view',
          'page',
          true
        ),
        (
          'advisers.view',
          'Consultar asesores',
          'Ver el listado y los datos generales de los asesores',
          'advisers',
          'advisers',
          'view',
          'action',
          true
        ),
        (
          'advisers.view_orders',
          'Ver pedidos de asesores',
          'Consultar los pedidos asignados a cada asesor',
          'advisers',
          'adviser_orders',
          'view',
          'action',
          true
        ),
        (
          'advisers.view_performance',
          'Ver rendimiento de asesores',
          'Consultar ventas, recaudos y analitica de rendimiento de los asesores',
          'advisers',
          'adviser_performance',
          'view',
          'action',
          true
        ),
        (
          'advisers.manage',
          'Gestionar asesores',
          'Agregar, editar, activar y desactivar asesores',
          'advisers',
          'advisers',
          'manage',
          'action',
          true
        )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN (
        'page.advisers.view',
        'advisers.view_orders',
        'advisers.view_performance'
      )
    `);

    await queryRunner.query(`
      UPDATE permissions
      SET
        name = 'Ver asesores',
        description = 'Acceso a la pagina de asesores',
        module = 'advisers',
        resource = 'advisers',
        action = 'view',
        type = 'page',
        is_active = true
      WHERE code = 'advisers.view'
    `);

    await queryRunner.query(`
      UPDATE permissions
      SET
        name = 'Gestionar asesores',
        description = 'Crear, editar y desactivar asesores',
        module = 'advisers',
        resource = 'advisers',
        action = 'manage',
        type = 'action',
        is_active = true
      WHERE code = 'advisers.manage'
    `);
  }
}
