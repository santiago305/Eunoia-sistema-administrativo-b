# Propuesta futura: evaluación escalable de workflows de pedidos

Fecha de documentación: 2026-08-27  
Estado: idea y plan de arquitectura para implementación futura; no se implementa por ahora.

## Objetivo

Permitir que el ERP administre decenas o cientos de miles de pedidos sin reevaluarlos todos cada vez que cambia un dato o se publica una nueva revisión de workflow.

La solución no consiste en aumentar el límite del barrido de 500 a 1,000, 10,000 o 100,000. El sistema debe evaluar únicamente pedidos que tengan un motivo concreto para ser evaluados.

## Principio central

Combinar tres mecanismos:

1. Evaluación dirigida por eventos.
2. Evaluación programada para condiciones de fecha.
3. Barrido de reconciliación como mecanismo de seguridad.

## 1. Evaluación dirigida por eventos

Cada modificación debe identificar qué pedidos podrían verse afectados.

| Evento | Pedidos que deben encolarse |
| --- | --- |
| Pedido creado o importado | Solamente el pedido creado |
| Pedido actualizado | Solamente el pedido actualizado |
| Pago creado, eliminado o corregido | Solamente el pedido del pago |
| Cliente actualizado | Pedidos pendientes de ese cliente que dependan de los campos modificados |
| Inventario actualizado | Pedidos pendientes del almacén y stock item afectados |
| Almacén cambiado | Solamente el pedido modificado |
| Fecha de entrega cambiada | Solamente el pedido modificado |
| Estado cambiado manualmente | El mismo pedido, para continuar cualquier transición automática encadenada |
| Workflow publicado | Solamente pedidos incluidos expresamente en la migración |

El proyecto ya contiene reactividad para algunos eventos de cliente e inventario. La evolución recomendada es convertir esa reactividad en trabajos durables y recuperables, en lugar de depender exclusivamente de eventos en memoria.

## 2. Condiciones basadas en fecha

Los pedidos con condiciones temporales deben tener calculada su próxima fecha de evaluación.

Campo sugerido:

```text
next_workflow_evaluation_at
```

Ejemplo:

- Fecha de entrega: 2026-08-28.
- Condición: avanzar un día antes.
- Próxima evaluación: 2026-08-27 00:00 en la zona horaria del negocio.

El worker consulta solamente pedidos vencidos:

```sql
WHERE next_workflow_evaluation_at <= NOW()
```

Debe existir un índice parcial o compuesto que permita encontrar rápidamente evaluaciones pendientes.

Con 100,000 pedidos almacenados y 85 vencimientos durante el día, el sistema procesa esos 85 y no escanea los otros 99,915.

Después de cada evaluación se debe:

- Limpiar la próxima fecha si no quedan condiciones temporales pendientes.
- Calcular la siguiente fecha relevante si todavía existe una condición futura.
- Recalcularla cuando cambie la fecha de entrega o el workflow asignado.

## 3. Cola durable de evaluaciones

Se propone una tabla PostgreSQL como fuente durable de trabajo:

```text
workflow_evaluation_jobs
- id
- sale_order_id
- workflow_revision_id
- reason
- available_at
- status
- attempts
- locked_at
- locked_by
- last_error
- created_at
- updated_at
```

Estados sugeridos:

```text
PENDING
PROCESSING
COMPLETED
RETRY
FAILED
```

### Consolidación de eventos

Debe evitarse la creación de múltiples trabajos pendientes para el mismo pedido. Si llegan varios eventos antes de procesarlo, se actualiza o consolida el trabajo existente.

Una posible clave lógica sería:

```text
sale_order_id + workflow_revision_id + estado pendiente
```

El worker siempre vuelve a leer el pedido y sus datos actuales. No debe confiar en una copia antigua incluida en el evento.

### Procesamiento concurrente

Los workers pueden tomar lotes técnicos pequeños, por ejemplo 100 trabajos:

```sql
FOR UPDATE SKIP LOCKED
LIMIT 100
```

Después de procesar esos 100 toman los siguientes 100 hasta que:

- La cola quede vacía.
- Se alcance un tiempo máximo controlado para esa ejecución.
- El sistema aplique una política de capacidad o presión operativa.

El tamaño del lote controla memoria y duración de las transacciones; no debe convertirse en un límite funcional de pedidos por hora.

## 4. Publicación y revisiones del workflow

Las revisiones publicadas deben ser inmutables. Al publicar una nueva revisión, el usuario debe elegir el alcance.

### Opción A: solamente pedidos nuevos

- Es la opción predeterminada y más segura.
- Los pedidos existentes permanecen en su revisión histórica.
- Los nuevos pedidos reciben la nueva revisión.

### Opción B: migrar pendientes afectados

- Se comparan la revisión anterior y la nueva.
- Se determinan estados, transiciones, condiciones y acciones modificados.
- Se seleccionan solamente pedidos activos, no finales y ubicados en estados afectados.
- Los candidatos se envían a una migración asincrónica.

### Opción C: migrar pedidos seleccionados

- El usuario selecciona pedidos concretos o utiliza filtros.
- El sistema presenta una vista previa antes de confirmar.
- La migración se ejecuta en segundo plano.

### Ejemplo

Si cambió únicamente la transición `Coordinado → Programado`, deben considerarse pedidos:

- De la misma familia/revisión del workflow.
- Activos.
- No finales ni cancelados.
- Actualmente en `Coordinado`.

No deben reevaluarse pedidos entregados, anulados, pertenecientes a otros workflows o ubicados en estados que no dependen de la transición modificada.

## 5. Publicación rápida y migración asincrónica

La publicación de un workflow no debe mantener una transacción abierta mientras recorre miles de pedidos.

Flujo recomendado:

1. Validar y publicar la nueva revisión.
2. Crear un trabajo de migración con su alcance.
3. Generar los candidatos mediante consultas indexadas.
4. Encolar evaluaciones por pedido.
5. Procesar los pedidos en segundo plano.
6. Mostrar progreso, éxitos, omisiones y errores.

Estados sugeridos para la migración:

```text
PENDING
RUNNING
COMPLETED
COMPLETED_WITH_ERRORS
FAILED
CANCELLED
```

La interfaz debe mostrar:

- Total de candidatos.
- Total procesado.
- Pedidos que cambiaron de estado.
- Pedidos que no cumplían condiciones.
- Errores y posibilidad de reintento.

## 6. Idempotencia y consistencia

Los trabajos pueden reintentarse por caídas del servidor, timeouts o bloqueos. Las acciones deben ser idempotentes.

Clave sugerida de ejecución:

```text
sale_order_id + transition_id + state_version
```

Antes de reservar, consumir o revertir stock se verifica si esa ejecución ya fue aplicada.

La transición, sus acciones, el historial y el movimiento de inventario deben confirmarse dentro de una transacción de base de datos.

Para reservas debe existir trazabilidad por pedido, stock item, almacén y cantidad. La bandera `reserve_bool` no debe ser la única fuente de verdad.

## 7. Outbox transaccional

Los eventos importantes deben persistirse en la misma transacción que modifica el dato origen.

Ejemplo:

1. Se registra un pago.
2. En la misma transacción se guarda un evento `sale-order.payment-updated` en una tabla outbox.
3. Un publicador convierte ese evento en un trabajo de evaluación.
4. Si el servidor cae después del commit, el evento permanece disponible para reintento.

Esto evita perder reevaluaciones por depender exclusivamente de streams en memoria.

## 8. Barrido de reconciliación

Debe conservarse un proceso periódico como respaldo, pero no como mecanismo principal.

Campo sugerido:

```text
last_workflow_checked_at
```

El barrido selecciona primero los pedidos menos recientemente revisados utilizando paginación por cursor, no `OFFSET` y no siempre los primeros registros.

Objetivos del barrido:

- Recuperar eventos perdidos.
- Detectar trabajos atascados.
- Corregir próximas fechas que no fueron programadas.
- Verificar inconsistencias entre estado, historial, reservas e inventario.

Los pedidos pueden distribuirse durante varias horas o durante el día, evitando picos de carga.

## 9. Reintentos, errores y observabilidad

Cada trabajo debe registrar:

- Motivo de evaluación.
- Número de intentos.
- Duración.
- Resultado de cada condición.
- Transición seleccionada.
- Acciones ejecutadas.
- Mensaje de error.
- Próxima fecha de reintento.

Los reintentos deben utilizar espera incremental. Después de un máximo configurable, el trabajo pasa a una cola de errores para revisión manual.

Métricas recomendadas:

- Trabajos pendientes.
- Antigüedad del trabajo más antiguo.
- Evaluaciones por minuto.
- Transiciones ejecutadas.
- Errores por condición o acción.
- Reservas inconsistentes.
- Pedidos sin próxima evaluación cuando tienen condiciones temporales.

## 10. Flujo operativo final

```text
Cambio relevante
      ↓
Evento durable en outbox
      ↓
Trabajo consolidado en la cola
      ↓
Worker bloquea el pedido
      ↓
Lee pedido, workflow y datos actuales
      ↓
Evalúa condiciones
      ↓
Ejecuta transición y acciones en una transacción
      ↓
Registra historial y trazabilidad
      ↓
Calcula la próxima evaluación
```

## Plan de implementación futuro

### Fase 1: eliminar el problema de justicia del barrido

- Reemplazar la selección repetida de los 500 más antiguos.
- Agregar cursor justo o tabla de trabajos.
- Procesar lotes pequeños de manera continua.
- Agregar reintentos y registro de errores.

### Fase 2: programar condiciones temporales

- Agregar `next_workflow_evaluation_at`.
- Calcular la próxima fecha desde las condiciones del workflow.
- Crear índice y worker de trabajos vencidos.
- Recalcular cuando cambien fechas o workflow.

### Fase 3: publicación y migración controlada

- Agregar selección de alcance al publicar.
- Crear vista previa de impacto.
- Separar publicación y migración.
- Ejecutar migraciones como trabajos asincrónicos.

### Fase 4: robustez ERP

- Implementar outbox transaccional.
- Hacer idempotentes las acciones.
- Crear trazabilidad de reservas por pedido.
- Agregar panel operativo, métricas y cola de errores.

## Criterios de aceptación futuros

- Ningún pedido queda olvidado por estar fuera de un límite fijo.
- Un cambio de pago evalúa solamente su pedido.
- Un cambio de inventario evalúa solamente pedidos dependientes del stock afectado.
- Una condición temporal se ejecuta cerca de su hora programada sin escanear todos los pedidos.
- Publicar una revisión no migra pedidos existentes sin una decisión explícita.
- Una migración de miles de pedidos no mantiene una única transacción extensa.
- Reintentar un trabajo no duplica reservas ni movimientos.
- Es posible explicar por qué un pedido fue o no fue actualizado.

## Alcance actual

Este documento registra una idea de arquitectura y un plan para trabajo futuro. No autoriza ni implica cambios actuales en código, base de datos, infraestructura o producción.
