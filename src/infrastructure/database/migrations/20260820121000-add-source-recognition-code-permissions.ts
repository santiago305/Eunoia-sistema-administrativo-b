import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceRecognitionCodePermissions20260820121000
  implements MigrationInterface
{
  name = "AddSourceRecognitionCodePermissions20260820121000";

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
          'sources.recognition_codes.view',
          'Ver códigos de reconocimiento de enganches',
          'Abrir y consultar los códigos asociados a cada enganche',
          'sources',
          'source_recognition_codes',
          'view',
          'action',
          true
        ),
        (
          'sources.recognition_codes.manage',
          'Gestionar códigos de reconocimiento de enganches',
          'Crear, editar, activar, eliminar y restaurar códigos de enganches',
          'sources',
          'source_recognition_codes',
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
        'sources.recognition_codes.view',
        'sources.recognition_codes.manage'
      )
    `);
  }
}
