import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgencySubsidiaries20260603000000 implements MigrationInterface {
  name = "CreateAgencySubsidiaries20260603000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE subsidiaries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
        alias varchar(120) NOT NULL,
        department_id varchar(2) NOT NULL,
        province_id varchar(4) NOT NULL,
        district_id varchar(6) NOT NULL,
        address varchar(300),
        base_price numeric(12,2) NOT NULL DEFAULT 0,
        note text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_subsidiaries_agency_id ON subsidiaries(agency_id)`);
    await queryRunner.query(`CREATE INDEX idx_subsidiaries_department_id ON subsidiaries(department_id)`);
    await queryRunner.query(`CREATE INDEX idx_subsidiaries_province_id ON subsidiaries(province_id)`);
    await queryRunner.query(`CREATE INDEX idx_subsidiaries_district_id ON subsidiaries(district_id)`);

    await queryRunner.query(`
      INSERT INTO subsidiaries (
        agency_id, alias, department_id, province_id, district_id, address, base_price, is_active, created_at, updated_at
      )
      SELECT
        id,
        COALESCE(NULLIF(reference, ''), name),
        department_id,
        province_id,
        district_id,
        address,
        0,
        is_active,
        created_at,
        updated_at
      FROM agencies
      WHERE department_id IS NOT NULL
        AND province_id IS NOT NULL
        AND district_id IS NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE agencies DROP COLUMN reference`);
    await queryRunner.query(`ALTER TABLE agencies DROP COLUMN address`);
    await queryRunner.query(`ALTER TABLE agencies DROP COLUMN department_id`);
    await queryRunner.query(`ALTER TABLE agencies DROP COLUMN province_id`);
    await queryRunner.query(`ALTER TABLE agencies DROP COLUMN district_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE agencies ADD COLUMN reference varchar(120)`);
    await queryRunner.query(`ALTER TABLE agencies ADD COLUMN address varchar(300)`);
    await queryRunner.query(`ALTER TABLE agencies ADD COLUMN department_id varchar(2)`);
    await queryRunner.query(`ALTER TABLE agencies ADD COLUMN province_id varchar(4)`);
    await queryRunner.query(`ALTER TABLE agencies ADD COLUMN district_id varchar(6)`);

    await queryRunner.query(`
      UPDATE agencies a
      SET
        reference = s.alias,
        address = s.address,
        department_id = s.department_id,
        province_id = s.province_id,
        district_id = s.district_id
      FROM (
        SELECT DISTINCT ON (agency_id)
          agency_id, alias, address, department_id, province_id, district_id
        FROM subsidiaries
        WHERE is_active = true
        ORDER BY agency_id, created_at ASC
      ) s
      WHERE s.agency_id = a.id
    `);

    await queryRunner.query(`ALTER TABLE agencies ALTER COLUMN department_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE agencies ALTER COLUMN province_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE agencies ALTER COLUMN district_id SET NOT NULL`);
    await queryRunner.query(`DROP TABLE subsidiaries`);
  }
}
