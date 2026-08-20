import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizePeruvianMobilePhones20260820123000
  implements MigrationInterface
{
  name = "NormalizePeruvianMobilePhones20260820123000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE telephones AS telephone
      SET number = CASE
        WHEN cleaned.digits ~ '^9[0-9]{8}$'
          THEN cleaned.digits
        WHEN cleaned.digits ~ '^519[0-9]{8}$'
          THEN substring(cleaned.digits FROM 3)
        WHEN cleaned.digits ~ '^00519[0-9]{8}$'
          THEN substring(cleaned.digits FROM 5)
        ELSE telephone.number
      END
      FROM (
        SELECT
          id,
          regexp_replace(number, '[^0-9]', '', 'g') AS digits
        FROM telephones
      ) AS cleaned
      WHERE telephone.id = cleaned.id
        AND (
          cleaned.digits ~ '^9[0-9]{8}$'
          OR cleaned.digits ~ '^519[0-9]{8}$'
          OR cleaned.digits ~ '^00519[0-9]{8}$'
        )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Canonical phone formatting is intentionally irreversible: the original
    // punctuation and optional country prefix cannot be reconstructed safely.
  }
}
