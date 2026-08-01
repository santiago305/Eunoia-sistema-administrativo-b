# Unificación de preguía y preparación mediante workflows

**Fecha:** 2026-08-01  
**Estado:** aprobado para implementación  
**Alcance:** backend y frontend de Pedidos

## Contexto

Los campos booleanos `preguide` y `prepared` ya eran modificados por las acciones globales de workflow `MARK_PREGUIDE` y `MARK_PREPARED`. Después se agregó una segunda vía de escritura directa mediante endpoints `/tracking`, permisos dedicados y controles individuales y masivos independientes.

Esa segunda vía duplica la operación de marcar los indicadores y puede ignorar condiciones, exclusiones e historial del workflow. El sistema debe volver a tener una sola fuente de verdad: las acciones globales.

## Alternativas consideradas

1. **Conservar ambas vías.** Mantiene la reversión inmediata, pero perpetúa reglas, permisos e historiales distintos. Se descarta.
2. **Ocultar solamente los controles directos.** Reduce la confusión visual, pero deja API y lógica duplicadas disponibles. Se descarta.
3. **Eliminar la vía directa y usar únicamente workflows.** Unifica autorización, validación e historial. Es la alternativa seleccionada.

## Diseño aprobado

### Fuente única de escritura

- `MARK_PREGUIDE` marca `preguide=true`.
- `MARK_PREPARED` marca `prepared=true`.
- Ambas operaciones se ejecutan exclusivamente como acciones globales de workflow.
- Los campos `preguide` y `prepared` permanecen en `sale_orders` como representación persistida del resultado.
- La disponibilidad de cada acción continúa dependiendo del workflow asignado, estado actual, exclusiones, condiciones y permisos para ejecutar acciones globales.

### Eliminación en backend

Se retirarán:

- `PATCH /sale-orders/:id/tracking`.
- `PATCH /sale-orders/bulk/tracking`.
- DTO, caso de uso y pruebas dedicadas a escritura directa.
- El método de repositorio `setTrackingByIds` y sus pruebas.
- Los permisos `sale_orders.preguide.update` y `sale_orders.prepared.update` del catálogo activo.
- La autorización especial que exige esos permisos adicionales al ejecutar `MARK_PREGUIDE` o `MARK_PREPARED`.

El ejecutor de acciones de workflow volverá a usar las operaciones específicas `markPreguide` y `markPrepared`, preservando la transacción proporcionada por el motor de workflow.

No se eliminarán migraciones históricas ya aplicadas. Los dos códigos se agregarán a `DEPRECATED_PERMISSION_CODES`; el seeder vigente los marcará como inactivos y el acceso efectivo dejará de incluirlos sin destruir las relaciones históricas de roles y usuarios. Tampoco se revertirán las restricciones `NOT NULL DEFAULT false` de los booleanos.

### Eliminación en frontend

Se retirarán:

- El cliente HTTP de seguimiento individual y masivo.
- El control clicable directo de la columna Seguimiento.
- El modal masivo independiente de Seguimiento.
- Los checkboxes directos de preguía y preparación del editor.
- Las capacidades y constantes asociadas a los dos permisos retirados.

La tabla y el detalle conservarán la visualización de `preguide` y `prepared` en modo informativo. Las operaciones disponibles seguirán apareciendo en el selector existente de acciones globales, tanto individual como masivamente.

### Reversión

Esta primera fase no agrega reversión. Después de eliminar la duplicación se diseñarán acciones globales inversas para:

- pasar de con preguía a sin preguía;
- pasar de preparado a no preparado.

Las futuras acciones inversas deberán usar el mismo motor de workflows, permisos e historial. No se reintroducirá un endpoint directo.

## Datos y compatibilidad

- No se modifica el valor actual de ningún pedido.
- No se eliminan columnas ni registros de seguimiento.
- No se eliminan migraciones ya ejecutadas.
- Los clientes que intenten usar `/tracking` recibirán `404` después del despliegue.
- Los roles que solo tenían permisos dedicados de seguimiento perderán esa capacidad y deberán recibir `sale_orders.execute_workflow_action` junto con los permisos de consulta necesarios.

## Pruebas

Backend:

- El catálogo deja de exponer los dos permisos dedicados.
- El controlador deja de registrar ambas rutas `/tracking`.
- `MARK_PREGUIDE` y `MARK_PREPARED` siguen actualizando los booleanos mediante el workflow.
- La ejecución individual y masiva de acciones globales continúa autorizada por `sale_orders.execute_workflow_action`.

Frontend:

- No se renderiza la acción masiva Seguimiento.
- La columna muestra indicadores de solo lectura.
- La sección Envío muestra los indicadores sin controles directos.
- El servicio no expone llamadas a `/tracking`.
- Las acciones globales siguen disponibles en los controles de cambio existentes.

## Fuera de alcance de esta fase

- Crear las acciones globales inversas.
- Rediseñar el editor de workflows.
- Cambiar los valores actuales de `preguide` o `prepared`.
- Alterar otras reglas de permisos de Pedidos.
