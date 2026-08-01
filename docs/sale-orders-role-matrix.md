# Matriz de roles de Pedidos

Esta matriz es una referencia para configurar roles; no asigna permisos automáticamente.

| Rol | Permisos principales | Dependencias |
|---|---|---|
| Consulta | `page.sale-orders.view`, `sale_orders.view`, `sale_orders.view_detail` | El backend redacta datos sensibles sin permisos específicos. |
| Asesor | Consulta + `sale_orders.assign_adviser`, `sale_orders.change_state` | Requiere acceso a la lista. |
| Operaciones | Consulta + `sale_orders.create`, `sale_orders.update`, `sale_orders.delete`, `sale_orders.import`, `sale_orders.export`, `sale_orders.view_amounts`, `sale_orders.products.view`, `sale_orders.stock.view` | `page.sale-orders.view` y `sale_orders.view` son obligatorios para entrar/listar. |
| Seguimiento de Envíos | Consulta + `sale_orders.workflows.view`, `sale_orders.change_state`, `sale_orders.execute_workflow_action` | Preguía y preparación se ejecutan como acciones globales del flujo; no incluye edición financiera ni diseño de workflows. |
| Finanzas de Pedidos | Consulta + `sale_orders.view_amounts`, `sale_orders.payments.view`, `sale_orders.payments.create`, `sale_orders.payments.update`, `sale_orders.payments.delete` | Los importes y pagos siguen protegidos por permisos independientes. |
| Administrador de Flujos | Consulta + `sale_orders.workflows.view`, `sale_orders.workflows.manage`, `sale_orders.assign_workflow`, `sale_orders.execute_workflow_action` | Las transiciones también requieren `change_state` cuando corresponda. |

## Reglas críticas

- Restaurar requiere conjuntamente `sale_orders.view_deleted` y `sale_orders.restore`.
- Un pedido inactivo es de solo lectura; únicamente restaurar puede modificarlo.
- Las acciones globales del workflow son la única vía para modificar preguía y preparación; la tabla y el editor solo muestran su resultado.
- `ABONADO ENVIO` dispone de `Preguía`, `Sin preguía`, `Preparado` y `Sin preparar`. El motor alterna cada par según el valor actual para evitar acciones redundantes.
- `ABONADO CE` no recibe acciones globales de seguimiento en el seeder.
- Un DENY explícito del usuario prevalece sobre el permiso heredado por rol.
- Los pedidos eliminados no participan en ventas, pagos, saldos, ingresos, estadísticas, exportaciones activas ni workflows automáticos.

## Catálogo

La fuente única de códigos es `src/modules/sale-orders/application/constants/sale-order-permissions.ts`. El catálogo contiene 37 permisos: uno de página y 36 de acciones. Los códigos `sale_orders.preguide.update` y `sale_orders.prepared.update` están obsoletos y el seeder los marca como inactivos.

## Checklist de despliegue

1. Ejecutar migraciones y consultar el catálogo desde un superadministrador.
2. Confirmar `prepared` y `preguide` como `NOT NULL DEFAULT false`.
3. Probar una cuenta por rol y una cuenta con DENY explícito.
4. Verificar HTTP, WebSocket y acciones globales individuales y masivas con la misma matriz.
