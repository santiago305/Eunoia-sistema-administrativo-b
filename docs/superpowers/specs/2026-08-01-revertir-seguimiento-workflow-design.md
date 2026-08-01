# Diseño: acciones globales inversas de seguimiento

## Objetivo

Permitir revertir Preguía y Preparación exclusivamente mediante acciones globales del workflow, conservando a los workflows como única fuente de escritura de `preguide` y `prepared`.

## Alcance aprobado

- `ABONADO ENVIO` tendrá cuatro transiciones globales sembradas: `Preguía`, `Sin preguía`, `Preparado` y `Sin preparar`.
- `ABONADO CE` permanecerá sin acciones de Preguía ni Preparación. Su semilla no se modificará.
- No se restaurarán endpoints `/tracking`, permisos dedicados, checkboxes, botones sobre las etiquetas ni un modal masivo paralelo.
- La tabla y el editor continuarán mostrando únicamente el valor resultante.

Los tipos de acción forman parte del catálogo técnico global porque el motor y el diseñador comparten un único catálogo. Sin embargo, las nuevas transiciones se sembrarán únicamente dentro de `ABONADO ENVIO`; `ABONADO CE` no las recibirá.

## Acciones

Se mantendrán las acciones idempotentes existentes y se añadirán sus inversas explícitas:

| Acción | Efecto |
|---|---|
| `MARK_PREGUIDE` | Establece `preguide=true`. |
| `UNMARK_PREGUIDE` | Establece `preguide=false`. |
| `MARK_PREPARED` | Establece `prepared=true`. |
| `UNMARK_PREPARED` | Establece `prepared=false`. |

No se usará una acción `TOGGLE`: en una selección masiva con valores mezclados produciría resultados diferentes por pedido y no expresaría el resultado solicitado por el operador.

## Alternativas evaluadas

1. **Acciones inversas explícitas (seleccionada):** son legibles en historial, idempotentes y expresan el resultado final sin configuración.
2. **Acciones `SET_*` con `{ value: boolean }`:** reducen el número de tipos, pero agregan configuración y hacen menos clara la acción mostrada al operador.
3. **Acciones `TOGGLE_*`:** requieren menos transiciones, pero son inseguras para selecciones masivas con valores mezclados.

## Arquitectura y flujo

1. El catálogo de acciones y `ActionFactory` reconocerán los dos tipos inversos sin configuración adicional.
2. El repositorio de pedidos expondrá operaciones explícitas `unmarkPreguide` y `unmarkPrepared`, que escribirán `false` de forma idempotente dentro de la transacción del workflow.
3. `SaleOrderWorkflowActionRunnerService` ejecutará las inversas tanto en transiciones sin stock como en transiciones que contengan otras acciones.
4. `GetAvailableTransitionsUseCase` alternará las opciones según el valor actual:
   - con `preguide=false`, muestra `Preguía` y oculta `Sin preguía`;
   - con `preguide=true`, oculta `Preguía` y muestra `Sin preguía`;
   - con `prepared=false`, muestra `Preparado` y oculta `Sin preparar`;
   - con `prepared=true`, oculta `Preparado` y muestra `Sin preparar`.
5. La ejecución individual y masiva continuará usando los endpoints existentes de workflow, sus permisos y la notificación realtime actual.

## Seeder

Se añadirán a `ABONADO ENVIO` dos transiciones globales `RUN_ACTIONS` con códigos estables y únicos:

- `Sin preguía` con `UNMARK_PREGUIDE`.
- `Sin preparar` con `UNMARK_PREPARED`.

Cada transición inversa heredará las mismas restricciones de estados que su acción positiva correspondiente. El seeder seguirá siendo idempotente: al encontrar un workflow existente, agregará o actualizará las transiciones por código sin duplicarlas.

La prueba del seeder exigirá expresamente que `ABONADO CE` no contenga ninguna de las cuatro acciones de seguimiento.

## Frontend

El catálogo tipado y el editor de workflows incorporarán etiquetas legibles para `UNMARK_PREGUIDE` y `UNMARK_PREPARED`. La pantalla de Pedidos no recuperará controles directos: recibirá las nuevas transiciones por el mismo listado de acciones disponibles y por el mismo modal `Cambiar estado`.

## Errores y consistencia

- Los pedidos eliminados continuarán rechazando cualquier acción de workflow.
- Las escrituras inversas se ejecutarán en la misma transacción que la transición global.
- Repetir una acción inversa será seguro a nivel de repositorio; normalmente no aparecerá de nuevo porque la disponibilidad se filtra por el valor actual.
- Un fallo en una fila masiva conservará el resumen existente y no detendrá las demás filas.

## Pruebas

- RED/GREEN del catálogo, factory y endpoint de tipos de acción.
- RED/GREEN del repositorio para persistir ambos valores en `false`.
- RED/GREEN del runner en sus dos rutas de ejecución.
- RED/GREEN de disponibilidad para los cuatro estados booleanos.
- RED/GREEN del seeder: cuatro acciones en `ABONADO ENVIO`, ninguna en `ABONADO CE` e IDs estables.
- RED/GREEN del tipado y etiquetas frontend.
- Suites enfocadas, e2e del contrato de workflows y builds de backend/frontend.

## Despliegue

No se necesita una migración de base de datos. Después de desplegar el backend se ejecutará el seeder base para insertar las dos nuevas transiciones en `ABONADO ENVIO`. Los permisos permanecen iguales: `sale_orders.change_state` para ejecución individual y `sale_orders.execute_workflow_action` para ejecución masiva.
