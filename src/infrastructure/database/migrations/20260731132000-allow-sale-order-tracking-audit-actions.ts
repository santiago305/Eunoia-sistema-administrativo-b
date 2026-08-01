import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowSaleOrderTrackingAuditActions20260731132000
  implements MigrationInterface
{
  name = "AllowSaleOrderTrackingAuditActions20260731132000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_auditory
      DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action
    `);
    await queryRunner.query(`
      ALTER TABLE sale_order_auditory
      ADD CONSTRAINT chk_sale_order_auditory_action
      CHECK (action_execution IN (
        'delete',
        'restore',
        'preguide_on',
        'preguide_off',
        'prepared_on',
        'prepared_off'
      ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_auditory
      DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action
    `);
    await queryRunner.query(`
      DELETE FROM sale_order_auditory
      WHERE action_execution IN (
        'preguide_on',
        'preguide_off',
        'prepared_on',
        'prepared_off'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE sale_order_auditory
      ADD CONSTRAINT chk_sale_order_auditory_action
      CHECK (action_execution IN ('delete', 'restore'))
    `);
  }
}
