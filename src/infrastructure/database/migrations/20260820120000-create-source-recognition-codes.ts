import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSourceRecognitionCodes20260820120000
  implements MigrationInterface
{
  name = "CreateSourceRecognitionCodes20260820120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS source_recognition_codes (
        recognition_code_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id uuid NOT NULL,
        code varchar(80) NOT NULL,
        description varchar(180) NULL,
        is_active boolean NOT NULL DEFAULT true,
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid NULL,
        updated_by uuid NULL,
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_source_recognition_codes_code UNIQUE (code),
        CONSTRAINT fk_source_recognition_codes_source
          FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_source_recognition_codes_source_id
      ON source_recognition_codes (source_id)
    `);

    await queryRunner.query(`
      INSERT INTO sources (id, name, detail, is_active, created_at, updated_at)
      SELECT gen_random_uuid(), seed.name, seed.name, true, now(), now()
      FROM (
        VALUES
          ('FACEBOOK'),
          ('INSTAGRAM'),
          ('WHATSAPP'),
          ('SHOPIFY'),
          ('ORGANICO'),
          ('SIN CODIGO')
      ) AS seed(name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM sources existing
        WHERE upper(trim(existing.name)) = seed.name
      )
    `);

    await queryRunner.query(`
      INSERT INTO source_recognition_codes (
        source_id,
        code,
        description,
        is_active,
        is_deleted
      )
      SELECT
        source_match.id,
        alias.code,
        'Código inicial migrado desde el reconocimiento de pedidos',
        true,
        false
      FROM (
        VALUES
          ('FACEBOOK', 'FB'),
          ('FACEBOOK', 'FACEBOOK'),
          ('INSTAGRAM', 'IG'),
          ('INSTAGRAM', 'INSTAGRAM'),
          ('WHATSAPP', 'WA'),
          ('WHATSAPP', 'WSP'),
          ('WHATSAPP', 'WHATSAPP'),
          ('SHOPIFY', 'SHOPIFY'),
          ('ORGANICO', 'ORG'),
          ('ORGANICO', 'ORGANICO')
      ) AS alias(source_name, code)
      CROSS JOIN LATERAL (
        SELECT source.id
        FROM sources source
        WHERE upper(trim(source.name)) = alias.source_name
        ORDER BY source.created_at ASC, source.id ASC
        LIMIT 1
      ) source_match
      ON CONFLICT (code) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        is_active = true,
        is_deleted = false,
        deleted_at = NULL,
        updated_at = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS source_recognition_codes`);
  }
}
