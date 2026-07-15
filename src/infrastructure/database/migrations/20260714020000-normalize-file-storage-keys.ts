import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeFileStorageKeys20260714020000 implements MigrationInterface {
  name = "NormalizeFileStorageKeys20260714020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE message_attachments
      SET storage_key = regexp_replace(
        storage_key,
        '^.*storage[\\/](private[\\/])?mail-attachments[\\/]',
        'private/mail-attachments/'
      )
      WHERE storage_key LIKE '%mail-attachments%'
    `);

    await queryRunner.query(`
      UPDATE deleted_mail_attachments
      SET storage_key = regexp_replace(
        storage_key,
        '^.*storage[\\/](deleted[\\/])?mail-attachments[\\/]',
        'deleted/mail-attachments/'
      )
      WHERE storage_key LIKE '%mail-attachments%'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
