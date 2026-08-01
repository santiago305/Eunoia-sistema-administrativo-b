# Guía de pruebas manuales de Pedidos

## Preparación

1. Ejecutar backend, frontend, PostgreSQL y Redis.
2. Aplicar migraciones y ejecutar el seeder base.
3. Crear cinco cuentas de prueba sin asignarlas a usuarios reales:
   - Sin Pedidos.
   - Consulta.
   - Eliminador sin `view_deleted`.
   - Seguimiento de Envíos.
   - Operaciones completas.
4. Crear pedidos de prueba activos y uno eliminado con pago, reserva y egreso logístico pendiente.

## 1. Cuenta sin permisos de Pedidos

- Confirmar que el menú Pedidos no aparece.
- Abrir `/pedidos` directamente: debe devolver acceso denegado.
- Intentar `GET /api/sale-orders`: debe devolver `403`.
- Intentar conectar los sockets `/sale-orders` y `/workflow-reactivity`: deben rechazarse.

## 2. Cuenta Consulta

Permisos mínimos: `page.sale-orders.view`, `sale_orders.view`, `sale_orders.view_detail`.

- Confirmar que puede listar solo pedidos propios/asignados y abrir el detalle.
- Confirmar que no aparecen Nuevo, Importar, Exportar, Eliminar, Restaurar ni acciones masivas.
- Confirmar que los datos sensibles aparecen redactados sin sus permisos específicos.
- Confirmar que no puede editar ni guardar.

## 3. Cuenta Eliminador sin pedidos eliminados

Permisos: Consulta + `sale_orders.delete`.

- Eliminar un pedido activo.
- Confirmar que el mensaje advierte que no podrá recuperarlo y no promete restauración.
- Confirmar que el selector Eliminados no aparece y el pedido desaparece de activos.
- Intentar abrirlo por ID: debe rechazarse sin `sale_orders.view_deleted`.

## 4. Cuenta Seguimiento de Envíos

Permisos: Consulta + `sale_orders.workflows.view`, `sale_orders.change_state`, `sale_orders.execute_workflow_action`.

- Confirmar que `Sin preguía`/`Con preguía` y `Sin preparar`/`Preparado` son etiquetas de solo lectura en tabla y detalle.
- Confirmar que no existen checkbox, clic de edición ni el modal masivo separado `Seguimiento`.
- En un pedido de `ABONADO ENVIO` con ambos valores en `false`, abrir `Cambiar estado` y confirmar que aparecen `Preguía` y `Preparado`, pero no sus acciones inversas.
- Ejecutar `Preguía`; comprobar que la etiqueta cambia a `Con preguía` y que la acción disponible pasa a ser `Sin preguía`.
- Ejecutar `Preparado`; comprobar que la etiqueta cambia a `Preparado` y que la acción disponible pasa a ser `Sin preparar`.
- Ejecutar `Sin preguía` y `Sin preparar`; comprobar que ambos valores regresan a `false` y reaparecen las acciones positivas.
- Seleccionar varios pedidos de `ABONADO ENVIO` y ejecutar las cuatro acciones globales masivamente; solo deben cambiar los pedidos seleccionados, activos y compatibles con la acción.
- En un pedido de `ABONADO CE`, confirmar que no aparece ninguna de las cuatro acciones de seguimiento.
- En Network, confirmar que no se llama a `/api/sale-orders/:id/tracking` ni `/api/sale-orders/bulk/tracking`.
- Confirmar que no aparece el `500` originado por la ruta directa eliminada.
- Confirmar que pedidos eliminados muestran etiquetas sin interacción y no admiten acciones globales.

## 5. Cuenta Operaciones completas

- Crear y editar un pedido.
- Importar desde Excel y exportar con columnas autorizadas.
- Asignar asesor y cambiar estado individual y masivamente.
- Marcar y revertir preguía/preparación individual y masivamente mediante acciones globales de `ABONADO ENVIO`.
- Eliminar un pedido reversible y verificar reservas/egresos.
- Intentar eliminar un pedido con stock consumido o egreso pagado: debe bloquearse sin cambios parciales.
- Restaurar con `sale_orders.view_deleted` + `sale_orders.restore`.

## 6. Cuenta Finanzas de Pedidos

Permisos: Consulta + `sale_orders.view_amounts` y permisos de pagos.

- Confirmar que puede ver importes, pagos y saldos.
- Crear, modificar y eliminar pagos según permisos individuales.
- Confirmar que no puede cambiar productos, stock, workflows ni seguimiento sin permisos.
- Verificar que un pedido eliminado no altera ingresos, finanzas, dashboard ni estadísticas.

## 7. Cuenta Administrador de Flujos

- Ver flujos con `sale_orders.workflows.view`.
- Crear/editar flujos con `sale_orders.workflows.manage`.
- Asignar workflow y ejecutar una transición normal con `sale_orders.change_state`.
- Ejecutar una acción global masiva con `sale_orders.execute_workflow_action`.
- Verificar que `MARK_PREGUIDE`, `UNMARK_PREGUIDE`, `MARK_PREPARED` y `UNMARK_PREPARED` no dependen de permisos directos de seguimiento.

## 8. DENY explícito

- Asignar un permiso al rol y denegarlo explícitamente al usuario.
- Repetir la llamada HTTP y conexión WebSocket: deben rechazarse.
- Confirmar que no se escribe en base de datos ni se emite realtime después del rechazo.

## 9. Eliminados y restauración

- Eliminar un pedido con pago.
- Confirmar que no aparece en activos/exportación y no participa en pagos, ingresos, dashboard, estadísticas ni workflows.
- Con `sale_orders.view_deleted` sin `sale_orders.restore`, confirmar que puede verlo pero no restaurarlo.
- Con ambos permisos, restaurarlo y confirmar que vuelve a activos con auditoría e historial conservados.

## Evidencia a registrar

Para cada caso guardar usuario, permisos efectivos, fecha, pantalla o endpoint, resultado esperado, resultado obtenido y captura/log de `403`, `2xx` o evento WebSocket.
