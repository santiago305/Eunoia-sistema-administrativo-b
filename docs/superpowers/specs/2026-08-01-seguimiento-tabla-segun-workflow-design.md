# Seguimiento de pedidos visible según el workflow

## Objetivo

La columna **Seguimiento** de la tabla de pedidos debe mostrar únicamente los indicadores que el workflow asignado al pedido utiliza. La configuración del workflow será la única fuente de verdad; no se distinguirán flujos por nombre ni se duplicará su lógica en el frontend.

El indicador de pago es la única excepción: siempre se muestra porque representa información financiera real del pedido y no una acción global del workflow.

## Reglas de visibilidad

Cada indicador se resuelve de forma independiente:

| Indicador | Se muestra cuando |
| --- | --- |
| Pago (`Pago pendiente` / `Pagado`) | Siempre |
| Comprobante | El workflow tiene una transición global, activa, de efecto `RUN_ACTIONS`, con la acción `MARK_INVOICE_SENT` |
| Preguía | El workflow tiene una transición global, activa, de efecto `RUN_ACTIONS`, con `MARK_PREGUIDE` o `UNMARK_PREGUIDE` |
| Preparación | El workflow tiene una transición global, activa, de efecto `RUN_ACTIONS`, con `MARK_PREPARED` o `UNMARK_PREPARED` |

Las exclusiones por estado de una transición no ocultan el indicador. Estas exclusiones determinan si una acción puede ejecutarse en el estado actual, mientras que la columna informa si esa capacidad pertenece al workflow.

Si el pedido no tiene workflow, el workflow está inactivo o no contiene una acción reconocida bajo una transición válida, las capacidades condicionales serán `false`.

Consecuencias esperadas con los seeders actuales:

- `ABONADO ENVIO` muestra pago, comprobante, preguía y preparación.
- `ABONADO CE` muestra pago y comprobante, pero no preguía ni preparación.
- Si se añade posteriormente solo una capacidad a un workflow, aparece únicamente su indicador correspondiente.

## Contrato del backend

Las respuestas de lectura de pedidos incluirán un objeto calculado en el nivel principal del pedido:

```ts
trackingCapabilities: {
  invoice: boolean;
  preguide: boolean;
  prepared: boolean;
}
```

Este objeto no se almacenará en la tabla de pedidos. Se derivará de las acciones activas del workflow para evitar datos duplicados y desincronizados.

El cálculo debe hacerse en lote para los workflows presentes en la consulta de pedidos. No se realizará una consulta adicional por cada fila. Los pedidos que compartan workflow reutilizarán las mismas capacidades calculadas.

El contrato debe estar presente tanto en los resultados paginados usados por la tabla como en las lecturas que puedan reemplazar o actualizar una fila. Así, una actualización en tiempo real no elimina las capacidades ya entregadas.

## Comportamiento del frontend

El frontend consumirá `trackingCapabilities` y no solicitará la definición completa de los workflows para decidir qué dibujar. Tampoco comprobará nombres como `ABONADO ENVIO` o `ABONADO CE`.

La columna conservará los componentes, colores, textos y tamaño visual actuales. Solo cambiará la condición de renderizado:

1. Renderizar siempre el indicador de pago.
2. Renderizar el indicador de comprobante cuando `trackingCapabilities.invoice` sea `true`.
3. Renderizar preguía cuando `trackingCapabilities.preguide` sea `true`.
4. Renderizar preparación cuando `trackingCapabilities.prepared` sea `true`.

Si `trackingCapabilities` falta en una respuesta antigua o incompleta, el frontend asumirá `false` para las tres capacidades condicionales. No debe inventar capacidades ni mostrar indicadores que el backend no confirmó.

## Flujo de datos

1. El backend obtiene los pedidos y sus workflows.
2. Reúne los identificadores únicos de workflow.
3. Consulta en lote sus transiciones globales, activas y `RUN_ACTIONS`, junto con sus acciones.
4. Reduce esas acciones a un mapa de capacidades por workflow.
5. Adjunta `trackingCapabilities` a cada pedido; si no hay workflow válido, adjunta los tres valores en `false`.
6. La tabla muestra pago y agrega únicamente los indicadores habilitados.

## Alcance

Incluido:

- Extender los tipos y respuestas de lectura de pedidos.
- Calcular capacidades desde la configuración real del workflow.
- Aplicar la visibilidad independiente en la columna Seguimiento.
- Mantener coherencia en cargas y actualizaciones de filas.
- Actualizar pruebas automatizadas y la guía de pruebas manuales.

Fuera de alcance:

- Cambiar seeders o acciones globales existentes.
- Cambiar los valores `invoiceSent`, `preguide` o `prepared`.
- Modificar la ejecución individual o masiva de acciones.
- Cambiar filtros, exportaciones, pagos, estados o permisos.
- Rediseñar los indicadores de seguimiento.

## Manejo de errores y compatibilidad

- Un workflow sin acciones de seguimiento no es un error: entrega capacidades en `false`.
- Un pedido sin workflow no es un error: entrega capacidades en `false`.
- Acciones desconocidas se ignoran.
- Transiciones inactivas, no globales o con un efecto distinto de `RUN_ACTIONS` no habilitan indicadores.
- El backend siempre devolverá las tres claves booleanas para que el contrato sea estable.

## Estrategia de pruebas

### Backend

- Workflow sin acciones reconocidas: las tres capacidades son `false`.
- Solo `MARK_INVOICE_SENT`: únicamente `invoice` es `true`.
- `MARK_PREGUIDE` o `UNMARK_PREGUIDE`: `preguide` es `true`.
- `MARK_PREPARED` o `UNMARK_PREPARED`: `prepared` es `true`.
- Una transición inactiva, no global o no `RUN_ACTIONS` no habilita la capacidad.
- Pedido sin workflow o con workflow inactivo: las tres capacidades son `false`.
- Varios pedidos del mismo workflow reciben el mismo resultado mediante una carga agrupada.

### Frontend

- El pago aparece aunque las tres capacidades sean `false`.
- Cada indicador condicional aparece únicamente con su booleano correspondiente.
- Una combinación parcial no muestra los demás indicadores.
- La ausencia de `trackingCapabilities` oculta los tres indicadores condicionales sin romper la tabla.
- Los textos y estilos existentes continúan utilizándose para estados positivos y negativos.

### Prueba manual principal

- Un pedido `ABONADO CE` debe mostrar pago y comprobante, sin `Sin preguía` ni `Sin preparar`.
- Un pedido `ABONADO ENVIO` debe mostrar los cuatro indicadores.
- Al añadir o retirar una acción global reconocida desde la configuración de un workflow, la tabla debe reflejar el cambio después de recargar, sin cambios de código por nombre de flujo.

## Criterios de aceptación

- La tabla nunca decide capacidades por el nombre del workflow.
- Pago siempre está visible.
- Comprobante, preguía y preparación aparecen de manera independiente según las acciones del workflow.
- `ABONADO CE` no muestra preguía ni preparación con la configuración actual.
- `ABONADO ENVIO` conserva todos sus indicadores con la configuración actual.
- No hay consultas por fila ni cambios en la base de datos.
- No se altera la ejecución de acciones globales ni el diseño existente de los indicadores.
