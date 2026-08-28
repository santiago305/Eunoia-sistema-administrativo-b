import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSaleOrdersAdvancedPermissionDescription20260828130000
  implements MigrationInterface
{
  name = 'UpdateSaleOrdersAdvancedPermissionDescription20260828130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE permissions
      SET description = 'Corregir importes, productos, packs, cantidades, insumos, tipo y almacén en pedidos finalizados o con stock reservado o consumido'
      WHERE code = 'sale_orders.advanced_orders'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE permissions
      SET description = 'Corregir importes, productos, packs, cantidades e insumos en pedidos finalizados o con stock reservado o consumido'
      WHERE code = 'sale_orders.advanced_orders'
    `);
  }
}
