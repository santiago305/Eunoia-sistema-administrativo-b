import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseModulePermissions20260626110000 implements MigrationInterface {
  name = "AddPurchaseModulePermissions20260626110000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('page.purchase-receptions.view', 'Ver recepciones de compras', 'Acceso a pantalla de recepcion de compras', 'purchases', 'purchase_receptions', 'view', 'page', true),
        ('page.recurring-purchases.view', 'Ver compras recurrentes', 'Acceso a pantalla de compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'view', 'page', true),
        ('purchases.submit', 'Enviar compra', 'Enviar compras para procesamiento o aprobacion', 'purchases', 'purchases', 'submit', 'action', true),
        ('purchases.reject', 'Rechazar compra', 'Rechazar solicitudes o procesamiento de compras', 'purchases', 'purchases', 'reject', 'action', true),
        ('purchases.receive', 'Registrar recepcion de compra', 'Registrar y confirmar recepciones de compras', 'purchases', 'purchase_receptions', 'receive', 'action', true),
        ('purchases.receive_stock', 'Recibir stock de compra', 'Confirmar recepciones que impactan inventario', 'purchases', 'purchase_receptions', 'receive_stock', 'action', true),
        ('purchases.manage_internal_material', 'Gestionar material interno', 'Gestionar compras de material interno sin venta directa', 'purchases', 'purchases', 'manage_internal_material', 'action', true),
        ('purchases.manage_assets', 'Gestionar activos', 'Gestionar compras de activos y equipos', 'purchases', 'purchases', 'manage_assets', 'action', true),
        ('purchases.manage_services', 'Gestionar servicios', 'Gestionar compras de servicios, membresias y suscripciones', 'purchases', 'purchases', 'manage_services', 'action', true),
        ('purchases.export', 'Exportar compras', 'Exportar compras e historial a archivos', 'purchases', 'purchases', 'export', 'action', true),
        ('purchases.view_costs', 'Ver costos de compras', 'Ver costos, importes y totales de compras', 'purchases', 'purchases', 'view_costs', 'action', true),
        ('purchases.attach_documents', 'Adjuntar documentos de compras', 'Adjuntar documentos y evidencias a compras', 'purchases', 'purchase_documents', 'attach_documents', 'action', true),
        ('purchases.delete_documents', 'Eliminar documentos de compras', 'Eliminar documentos y evidencias de compras', 'purchases', 'purchase_documents', 'delete_documents', 'action', true),
        ('payments.create', 'Crear pagos', 'Registrar pagos manuales o asociados a compras', 'payments', 'payments', 'create', 'action', true),
        ('payments.schedule', 'Programar pagos', 'Programar pagos futuros y vencimientos', 'payments', 'payments', 'schedule', 'action', true),
        ('payments.approve', 'Aprobar pagos', 'Aprobar pagos pendientes o programados', 'payments', 'payments', 'approve', 'action', true),
        ('payments.reject', 'Rechazar pagos', 'Rechazar pagos pendientes de aprobacion', 'payments', 'payments', 'reject', 'action', true),
        ('payments.delete', 'Eliminar pagos', 'Eliminar pagos registrados cuando corresponda', 'payments', 'payments', 'delete', 'action', true),
        ('payments.attach_evidence', 'Adjuntar evidencia de pago', 'Adjuntar comprobantes y evidencias a pagos', 'payments', 'payment_evidence', 'attach_evidence', 'action', true),
        ('payments.view_evidence', 'Ver evidencia de pago', 'Ver comprobantes y evidencias de pagos', 'payments', 'payment_evidence', 'view_evidence', 'action', true),
        ('payments.view_all', 'Ver todos los pagos', 'Consultar pagos de todos los usuarios', 'payments', 'payments', 'view_all', 'action', true),
        ('payments.view_own', 'Ver pagos propios', 'Consultar pagos propios o solicitados por el usuario', 'payments', 'payments', 'view_own', 'action', true),
        ('payments.export', 'Exportar pagos', 'Exportar reportes de pagos', 'payments', 'payments', 'export', 'action', true),
        ('payment_accounts.delete', 'Eliminar cuentas de pago', 'Eliminar cuentas/tarjetas/cajas de pago de empresa cuando no tengan uso', 'payment_accounts', 'payment_accounts', 'delete', 'action', true),
        ('payment_accounts.view_sensitive', 'Ver datos sensibles de cuentas', 'Ver datos sensibles no enmascarados de cuentas de pago', 'payment_accounts', 'payment_accounts', 'view_sensitive', 'action', true),
        ('purchases_dashboard.view', 'Ver dashboard de compras', 'Consultar metricas y graficos de compras', 'purchases_dashboard', 'purchases_dashboard', 'view', 'action', true),
        ('purchases_dashboard.view_costs', 'Ver costos en dashboard de compras', 'Ver importes y costos agregados en dashboard de compras', 'purchases_dashboard', 'purchases_dashboard', 'view_costs', 'action', true),
        ('purchases_dashboard.export', 'Exportar dashboard de compras', 'Exportar datos del dashboard de compras', 'purchases_dashboard', 'purchases_dashboard', 'export', 'action', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = EXCLUDED.is_active;
    `);
  }

  public async down(): Promise<void> {
    // Additive permission migration. Permissions stay available for rollback compatibility.
  }
}
