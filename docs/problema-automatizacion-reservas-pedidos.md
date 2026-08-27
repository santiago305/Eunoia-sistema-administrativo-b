# Problema observado: automatización y reservas de pedidos

Fecha de documentación: 2026-08-27  
Estado: documentado para revisión futura; no se implementan cambios por ahora.

## Contexto

Se modificó la condición de la transición que lleva un pedido desde `Coordinado` hasta `Programado`. La nueva regla debía permitir el avance desde un día antes de la fecha de entrega.

Después del cambio ocurrió lo siguiente:

1. Un pedido permaneció en `Coordinado` y no avanzó automáticamente.
2. Al abrir las acciones manuales del pedido, la transición a `Programado` ya aparecía habilitada.
3. El pedido se cambió manualmente a `Programado`.
4. El pedido mostró stock disponible `35` y `Reservado: Sí`.
5. En inventario no apareció la reserva correspondiente.
6. Un pedido posterior sí avanzó automáticamente y reservó inventario correctamente.

## Comportamiento esperado

- Cuando una condición temporal se cumple, el pedido debe avanzar automáticamente sin depender de una acción manual.
- Tanto el avance manual como el automático deben ejecutar las mismas acciones configuradas en la transición.
- Si la transición contiene `RESERVE_STOCK`, el pedido solo debe quedar marcado como reservado cuando el inventario haya sido reservado realmente.
- Un fallo en la reserva debe impedir o revertir el cambio de estado dentro de la misma transacción.

## Diagnóstico actual

### 1. Modificar el flujo no dispara una reevaluación inmediata

Guardar o publicar un cambio en las condiciones no provoca, por sí mismo, una reevaluación inmediata de todos los pedidos existentes.

La acción manual sí consulta y evalúa las condiciones al momento de abrir el menú del pedido. Por eso la opción `Programado` apareció disponible inmediatamente después del cambio, aunque el proceso automático todavía no hubiera revisado el pedido.

### 2. El barrido automático actual no pagina correctamente

El trabajo automático se ejecuta por defecto una vez por hora y solicita un máximo de 500 candidatos.

La selección siempre empieza por los pedidos más antiguos. No existe una página o cursor que haga que la siguiente ejecución continúe desde el pedido 501.

Ejemplo del comportamiento actual:

- Primera ejecución: pedidos 1 a 500.
- Segunda ejecución: vuelve a seleccionar pedidos 1 a 500.
- Los pedidos siguientes solamente entran si algunos de los primeros 500 dejan de ser candidatos.

Si los primeros 500 permanecen bloqueados por condiciones incumplidas, los pedidos posteriores pueden quedar sin evaluación durante un tiempo indefinido.

### 3. El avance manual y el automático usan el mismo ejecutor

No existe una regla intencional donde el avance manual cambie el estado sin reservar y el automático sí reserve.

En ambos casos la transición termina utilizando el mismo ejecutor de acciones de workflow. La diferencia observada apunta a los datos internos del pedido o a la transición/revisión utilizada, no a una diferencia funcional deseada entre avance manual y automático.

### 4. La pantalla mezcla dos fuentes diferentes

El valor mostrado como `Stock` proviene del inventario real del almacén. En cambio, `Reservado: Sí` se obtiene del campo booleano `sale_orders.reserve_bool`.

Por lo tanto, la interfaz puede mostrar simultáneamente:

- Stock disponible: `35`.
- Reservado: `Sí`.

Esto no demuestra que existan 35 unidades reservadas; solamente demuestra que el booleano del pedido está activado.

### 5. Es posible marcar el pedido como reservado sin movimiento real

Para reservar, el backend construye los requisitos utilizando:

- Componentes persistidos del pedido (`sale_order_item_components`).
- Insumos persistidos del pedido (`sale_order_supply_items`).
- Relación entre cada SKU y su `stock_item`.
- Almacén asignado al pedido.

Después intenta incrementar `reserved` en inventario por cada requisito encontrado. Sin embargo, al finalizar la acción establece `reserve_bool = true` aunque la lista de requisitos esté vacía o sus cantidades sean cero.

Esto explica el estado inconsistente observado:

- El pedido cambia correctamente a `Programado`.
- El pedido queda con `reserve_bool = true`.
- No se incrementa la reserva en inventario porque no hubo requisitos efectivos que recorrer.

## Diferencia probable entre los dos pedidos

El pedido que avanzó automáticamente después sí tenía una composición interna resoluble y cantidades válidas. Por eso la misma acción pudo incrementar la reserva.

Aunque dos pedidos muestren el mismo producto en la interfaz, pueden diferir internamente en:

- Componentes guardados.
- Insumos guardados.
- Cantidades de los componentes.
- Relación SKU–stock item.
- Almacén asignado.
- Revisión del workflow y transición ejecutada.

## Riesgos

- Pedidos que indican estar reservados sin tener inventario reservado.
- Decisiones posteriores basadas en una bandera que no representa el inventario real.
- Sobreventa al considerar disponible un stock que supuestamente pertenece a un pedido.
- Pedidos que nunca son reevaluados por quedar fuera de los primeros 500 candidatos.
- Diferencias difíciles de auditar entre historial del workflow, estado del pedido e inventario.

## Validaciones necesarias cuando se retome

Para confirmar un caso concreto se debe revisar por serie/correlativo:

1. Workflow y revisión asignados.
2. Estado anterior y estado actual.
3. Transición exacta registrada en el historial.
4. Rama ejecutada (`THEN` o `ELSE`).
5. Acciones configuradas en esa transición.
6. Componentes e insumos persistidos del pedido.
7. Cantidades resultantes de la composición.
8. Stock item correspondiente a cada SKU.
9. Almacén usado para la reserva.
10. Valores de inventario antes y después.
11. Valor de `reserve_bool` antes y después.

## Correcciones funcionales que deberán considerarse

- No permitir `reserve_bool = true` cuando no existe al menos un requisito de stock válido y positivo.
- Validar la consistencia entre la bandera del pedido y la reserva real.
- Registrar por pedido qué cantidades y stock items fueron reservados.
- Hacer idempotentes las acciones de reserva para evitar duplicados en reintentos.
- Reemplazar el barrido fijo de 500 por el diseño selectivo documentado en `propuesta-arquitectura-evaluacion-workflows.md`.

## Alcance actual

Este documento conserva el análisis del problema. En esta etapa no se modificará código, base de datos, configuración ni comportamiento de producción.
