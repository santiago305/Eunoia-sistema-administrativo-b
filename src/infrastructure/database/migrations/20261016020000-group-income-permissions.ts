import { MigrationInterface, QueryRunner } from "typeorm";

/** Groups the income lifecycle permissions without changing their technical codes or grants. */
export class GroupIncomePermissions20261016020000 implements MigrationInterface {
  name = "GroupIncomePermissions20261016020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('permissions') IS NULL THEN
          RETURN;
        END IF;

        UPDATE permissions
        SET module = 'income',
            name = CASE code
              WHEN 'sale_orders.payments.update_pending' THEN 'Editar ingresos por confirmar'
              WHEN 'sale_orders.payments.post' THEN 'Contabilizar ingresos'
              WHEN 'sale_orders.payments.post_bulk' THEN 'Contabilizar ingresos masivamente'
              WHEN 'sale_orders.payments.post_own' THEN 'Contabilizar ingresos propios'
              WHEN 'sale_orders.payments.post_high_value' THEN 'Contabilizar montos altos'
              WHEN 'sale_orders.payments.cancel_pending' THEN 'Cancelar ingresos por confirmar'
              WHEN 'sale_orders.payments.transfer_pending' THEN 'Transferir ingresos por confirmar'
              WHEN 'sale_orders.payments.reverse_posted' THEN 'Revertir ingresos contabilizados'
              WHEN 'sale_orders.payments.correct_posted' THEN 'Corregir ingresos contabilizados'
              WHEN 'sale_orders.payments.reenter_closed' THEN 'Reingresar ingresos cerrados'
              ELSE name
            END,
            description = CASE code
              WHEN 'sale_orders.payments.update_pending' THEN 'Modificar los datos de ingresos pendientes'
              WHEN 'sale_orders.payments.post' THEN 'Confirmar un ingreso y registrar su movimiento financiero'
              WHEN 'sale_orders.payments.post_bulk' THEN 'Confirmar de forma atómica ingresos pendientes de una misma fecha'
              WHEN 'sale_orders.payments.post_own' THEN 'Permitir contabilizar ingresos creados o editados por el mismo usuario'
              WHEN 'sale_orders.payments.post_high_value' THEN 'Autorizar ingresos que superan el umbral configurado'
              WHEN 'sale_orders.payments.cancel_pending' THEN 'Cancelar pendientes sin movimiento financiero'
              WHEN 'sale_orders.payments.transfer_pending' THEN 'Transferir un pendiente a otro pedido válido del mismo cliente'
              WHEN 'sale_orders.payments.reverse_posted' THEN 'Revertir un contabilizado con su movimiento compensatorio'
              WHEN 'sale_orders.payments.correct_posted' THEN 'Revertir el original y registrar una versión corregida'
              WHEN 'sale_orders.payments.reenter_closed' THEN 'Crear un pendiente vinculado a un ingreso cancelado o revertido'
              ELSE description
            END,
            updated_at = now()
        WHERE code IN (
          'sale_orders.payments.update_pending',
          'sale_orders.payments.post',
          'sale_orders.payments.post_bulk',
          'sale_orders.payments.post_own',
          'sale_orders.payments.post_high_value',
          'sale_orders.payments.cancel_pending',
          'sale_orders.payments.transfer_pending',
          'sale_orders.payments.reverse_posted',
          'sale_orders.payments.correct_posted',
          'sale_orders.payments.reenter_closed'
        );

        UPDATE permissions
        SET name = 'Ingresar a Ingresos',
            description = 'Mostrar el menú y permitir abrir la pantalla de Ingresos',
            updated_at = now()
        WHERE code = 'page.income.view';
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE permissions
      SET module = 'sale_orders',
          updated_at = now()
      WHERE code IN (
        'sale_orders.payments.update_pending',
        'sale_orders.payments.post',
        'sale_orders.payments.post_bulk',
        'sale_orders.payments.post_own',
        'sale_orders.payments.post_high_value',
        'sale_orders.payments.cancel_pending',
        'sale_orders.payments.transfer_pending',
        'sale_orders.payments.reverse_posted',
        'sale_orders.payments.correct_posted',
        'sale_orders.payments.reenter_closed'
      );

      UPDATE permissions
      SET name = 'Ver ingresos',
          description = 'Acceso a pantalla de ingresos',
          updated_at = now()
      WHERE code = 'page.income.view';
    `);
  }
}
