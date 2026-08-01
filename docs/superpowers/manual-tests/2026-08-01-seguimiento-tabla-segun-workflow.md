# Pruebas manuales: seguimiento de pedidos según workflow

## Preparación

1. Levantar backend y frontend con las versiones que contienen esta implementación.
2. Iniciar sesión con un usuario que pueda ingresar a Pedidos y ver pedidos de los workflows que se comprobarán.
3. Confirmar que existen al menos un pedido `ABONADO CE` y un pedido `ABONADO ENVIO`.
4. Abrir Pedidos y ubicar la columna **Seguimiento**.

No se necesita ejecutar una migración. Las capacidades se calculan desde la configuración actual del workflow.

## Matriz esperada

| Configuración del workflow | Indicadores esperados en Seguimiento |
| --- | --- |
| `ABONADO CE` actual | Pago + comprobante; no aparece preguía ni preparación |
| `ABONADO ENVIO` actual | Pago + comprobante + preguía + preparación |
| Solo acción de preguía | Pago + preguía, además de cualquier otra capacidad configurada explícitamente |
| Solo acción de preparación | Pago + preparación, además de cualquier otra capacidad configurada explícitamente |
| Sin workflow o workflow inactivo | Solo pago |

El resultado positivo o negativo de cada indicador continúa dependiendo de los datos del pedido. Por ejemplo, una capacidad de preguía visible mostrará `Con preguía` o `Sin preguía` según el valor guardado.

## Caso 1: ABONADO CE

1. Filtrar la tabla por workflow `ABONADO CE`.
2. Revisar la columna Seguimiento de uno o más pedidos.
3. Verificar que siempre aparezca `Pagado` o `Pago pendiente`.
4. Verificar que aparezca `Comp. enviado` o `Sin comprobante`.
5. Verificar que no aparezca `Con preguía`, `Sin preguía`, `Preparado` ni `Sin preparar`.

Resultado esperado: CE muestra información financiera y comprobante, pero no capacidades logísticas que su workflow no contiene.

## Caso 2: ABONADO ENVIO

1. Filtrar la tabla por workflow `ABONADO ENVIO`.
2. Revisar la columna Seguimiento.
3. Verificar que aparezca el indicador de pago.
4. Verificar que aparezca el indicador de comprobante.
5. Verificar que aparezca `Con preguía` o `Sin preguía`.
6. Verificar que aparezca `Preparado` o `Sin preparar`.

Resultado esperado: ENVÍO conserva sus cuatro indicadores.

## Caso 3: independencia entre capacidades

Realizar este caso únicamente en un workflow de prueba o en una configuración controlada.

1. Abrir la configuración del workflow.
2. Mantener una transición global, activa y de efecto `RUN_ACTIONS` con `MARK_PREGUIDE` o `UNMARK_PREGUIDE`.
3. Retirar las acciones `MARK_PREPARED` y `UNMARK_PREPARED` de sus transiciones globales activas.
4. Guardar el workflow y recargar la tabla de pedidos.
5. Verificar que preguía aparezca y preparación no aparezca.
6. Repetir a la inversa: mantener preparación y retirar preguía.
7. Verificar que preparación aparezca y preguía no aparezca.

Resultado esperado: cada capacidad cambia de forma independiente, sin depender del nombre del workflow.

## Caso 4: comprobante independiente

1. En un workflow de prueba, retirar `MARK_INVOICE_SENT` de las transiciones globales activas de efecto `RUN_ACTIONS`.
2. Guardar y recargar la tabla.
3. Verificar que el indicador de comprobante ya no aparezca.
4. Verificar que pago continúe visible.
5. Volver a agregar `MARK_INVOICE_SENT`, guardar y recargar.
6. Verificar que el indicador de comprobante reaparezca.

## Caso 5: transición que no debe habilitar un indicador

1. Configurar una acción reconocida dentro de una transición inactiva, no global o con efecto diferente de `RUN_ACTIONS`.
2. Guardar y recargar la tabla.
3. Verificar que esa acción no haga aparecer el indicador.
4. Convertir la transición en global, activa y `RUN_ACTIONS`.
5. Guardar y recargar.
6. Verificar que el indicador aparezca.

## Caso 6: actualización de una fila

1. Con un pedido visible, ejecutar una acción global disponible que actualice comprobante, preguía o preparación.
2. Esperar la actualización en tiempo real o recargar el pedido mediante la interfaz.
3. Verificar que el texto positivo/negativo cambie según el nuevo valor.
4. Verificar que no aparezcan indicadores que el workflow no soporta.

Resultado esperado: la actualización de la fila conserva `trackingCapabilities` y no vuelve al renderizado incondicional.

## Regresión visual y funcional

1. Verificar que los indicadores conservan tamaño, colores y textos anteriores.
2. Verificar que no existen checkboxes ni botones directos dentro de los indicadores.
3. Verificar que la columna sigue ocupando el mismo ancho y no rompe la alineación de la tabla.
4. Verificar que filtros, selección de pedidos, acciones masivas, exportación y apertura del detalle continúan funcionando.
5. Verificar que el estado de pago siempre aparece, aunque el pedido no tenga workflow.
