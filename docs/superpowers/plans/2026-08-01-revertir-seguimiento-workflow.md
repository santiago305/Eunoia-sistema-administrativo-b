# Acciones inversas de seguimiento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir `Sin preguía` y `Sin preparar` como acciones globales idempotentes sembradas únicamente en `ABONADO ENVIO`.

**Architecture:** El motor incorporará dos tipos explícitos `UNMARK_*`, que escribirán `false` mediante métodos específicos del repositorio dentro de la transacción del workflow. La disponibilidad alternará acciones positivas e inversas según los booleanos actuales; el seeder añadirá solo las transiciones inversas de `ABONADO ENVIO`, y el frontend únicamente ampliará el catálogo tipado y sus etiquetas.

**Tech Stack:** NestJS, TypeScript, TypeORM, Jest, React, Vitest, pnpm.

---

### Task 1: Contrato de acciones del workflow

**Files:**
- Modify: `src/modules/workflow/domain/constants/workflow-action.constants.ts`
- Modify: `src/modules/workflow/domain/factories/action.factory.ts`
- Test: `src/modules/workflow/domain/factories/action.factory.spec.ts`
- Modify: `src/modules/workflow/adapters/in/controllers/workflows.controller.ts`
- Test: `src/modules/workflow/adapters/in/controllers/workflows.controller.spec.ts`

- [ ] **Step 1: escribir pruebas RED del catálogo y factory**

Agregar casos que exijan los nuevos tipos sin configuración:

```ts
expect(() =>
  ActionFactory.validate({ type: ACTIONS.UNMARK_PREGUIDE, config: {} } as never),
).not.toThrow();
expect(() =>
  ActionFactory.validate({ type: ACTIONS.UNMARK_PREPARED, config: {} } as never),
).not.toThrow();
```

En el controlador, ampliar el resultado esperado de `listActionTypes()`:

```ts
expect(controller.listActionTypes()).toEqual(
  expect.arrayContaining([
    { type: 'UNMARK_PREGUIDE', configSchema: {} },
    { type: 'UNMARK_PREPARED', configSchema: {} },
  ]),
);
```

- [ ] **Step 2: verificar RED**

Run:

```powershell
pnpm test -- modules/workflow/domain/factories/action.factory.spec.ts modules/workflow/adapters/in/controllers/workflows.controller.spec.ts --runInBand
```

Expected: FAIL porque `ACTIONS.UNMARK_PREGUIDE`, `ACTIONS.UNMARK_PREPARED` y el catálogo HTTP todavía no existen.

- [ ] **Step 3: implementar los tipos mínimos**

Añadir al objeto `ACTIONS`:

```ts
UNMARK_PREGUIDE: 'UNMARK_PREGUIDE',
UNMARK_PREPARED: 'UNMARK_PREPARED',
```

Añadir ambos `case` sin configuración en `ActionFactory.validate` y ambos elementos en `WorkflowsController.listActionTypes()`:

```ts
{ type: ACTIONS.UNMARK_PREGUIDE, configSchema: {} },
{ type: ACTIONS.UNMARK_PREPARED, configSchema: {} },
```

- [ ] **Step 4: verificar GREEN**

Ejecutar el comando de Step 2. Expected: ambas suites pasan.

- [ ] **Step 5: commit del contrato**

```powershell
git add src/modules/workflow/domain src/modules/workflow/adapters/in/controllers
git commit -m "feat: add inverse tracking workflow actions"
```

### Task 2: Persistencia idempotente en `false`

**Files:**
- Modify: `src/modules/sale-orders/domain/ports/sale-order.repository.ts`
- Modify: `src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.ts`
- Test: `src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts`

- [ ] **Step 1: escribir pruebas RED del repositorio**

Agregar pruebas equivalentes a las existentes de `mark*`:

```ts
it('unmarks preguide false idempotently', async () => {
  await repository.unmarkPreguide('order-1');
  expect(update).toHaveBeenCalledWith(
    { id: 'order-1' },
    { preguide: false },
  );
});

it('unmarks prepared false idempotently', async () => {
  await repository.unmarkPrepared('order-1');
  expect(update).toHaveBeenCalledWith(
    { id: 'order-1' },
    { prepared: false },
  );
});
```

- [ ] **Step 2: verificar RED**

Run:

```powershell
pnpm test -- modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts --runInBand
```

Expected: FAIL porque los métodos no existen.

- [ ] **Step 3: implementar puerto y repositorio**

Añadir al puerto:

```ts
unmarkPreguide(saleOrderId: string, tx?: TransactionContext): Promise<void>;
unmarkPrepared(saleOrderId: string, tx?: TransactionContext): Promise<void>;
```

Implementar junto a `markPreguide` y `markPrepared`:

```ts
async unmarkPreguide(saleOrderId: string, tx?: TransactionContext): Promise<void> {
  await this.repo(tx).update({ id: saleOrderId }, { preguide: false });
}

async unmarkPrepared(saleOrderId: string, tx?: TransactionContext): Promise<void> {
  await this.repo(tx).update({ id: saleOrderId }, { prepared: false });
}
```

- [ ] **Step 4: verificar GREEN**

Ejecutar el comando de Step 2. Expected: suite aprobada.

- [ ] **Step 5: commit de persistencia**

```powershell
git add src/modules/sale-orders/domain/ports/sale-order.repository.ts src/modules/sale-orders/adapters/out/persistence/typeorm/repositories
git commit -m "feat: persist inverse order tracking actions"
```

### Task 3: Ejecución transaccional de acciones inversas

**Files:**
- Modify: `src/modules/workflow/application/services/sale-order-workflow-action-runner.service.ts`
- Test: `src/modules/workflow/application/services/sale-order-workflow-action-runner.service.spec.ts`

- [ ] **Step 1: escribir pruebas RED sin acciones de stock**

Añadir `unmarkPreguide` y `unmarkPrepared` a la doble del repositorio y crear dos casos:

```ts
await runner.run(order, [action(ACTIONS.UNMARK_PREGUIDE)], tx);
expect(saleOrders.unmarkPreguide).toHaveBeenCalledWith('order-1', tx);

await runner.run(order, [action(ACTIONS.UNMARK_PREPARED)], tx);
expect(saleOrders.unmarkPrepared).toHaveBeenCalledWith('order-1', tx);
```

- [ ] **Step 2: escribir prueba RED junto con stock**

Crear una transición que contenga `RESERVE_STOCK` y `UNMARK_PREPARED`; exigir que, además de la operación de stock, llame:

```ts
expect(saleOrders.unmarkPrepared).toHaveBeenCalledWith('order-1', tx);
```

- [ ] **Step 3: verificar RED**

Run:

```powershell
pnpm test -- modules/workflow/application/services/sale-order-workflow-action-runner.service.spec.ts --runInBand
```

Expected: FAIL porque el runner ignora `UNMARK_*`.

- [ ] **Step 4: implementar ambas rutas del runner**

En el bloque sin stock y en el bucle general añadir:

```ts
if (action.type === ACTIONS.UNMARK_PREGUIDE) {
  await this.saleOrderRepo.unmarkPreguide(order.id, tx);
}
if (action.type === ACTIONS.UNMARK_PREPARED) {
  await this.saleOrderRepo.unmarkPrepared(order.id, tx);
}
```

En el bucle general usar `continue` después de cada acción, igual que los `MARK_*` existentes.

- [ ] **Step 5: verificar GREEN**

Ejecutar el comando de Step 3. Expected: suite aprobada.

- [ ] **Step 6: commit del runner**

```powershell
git add src/modules/workflow/application/services/sale-order-workflow-action-runner.service.ts src/modules/workflow/application/services/sale-order-workflow-action-runner.service.spec.ts
git commit -m "feat: execute inverse tracking workflow actions"
```

### Task 4: Disponibilidad mutuamente excluyente

**Files:**
- Modify: `src/modules/workflow/application/usecases/get-available-transitions.usecase.ts`
- Test: `src/modules/workflow/application/usecases/get-available-transitions.usecase.spec.ts`

- [ ] **Step 1: escribir pruebas RED de Preguía**

Construir bundles globales con `MARK_PREGUIDE` y `UNMARK_PREGUIDE` y probar:

```ts
expect(namesFor({ preguide: false })).toContain('Preguía');
expect(namesFor({ preguide: false })).not.toContain('Sin preguía');
expect(namesFor({ preguide: true })).not.toContain('Preguía');
expect(namesFor({ preguide: true })).toContain('Sin preguía');
```

- [ ] **Step 2: escribir pruebas RED de Preparación**

Construir bundles con `MARK_PREPARED` y `UNMARK_PREPARED` y exigir la alternancia equivalente para `prepared=false/true`.

- [ ] **Step 3: verificar RED**

Run:

```powershell
pnpm test -- modules/workflow/application/usecases/get-available-transitions.usecase.spec.ts --runInBand
```

Expected: FAIL porque las acciones inversas todavía se consideran disponibles cuando el valor ya es `false`.

- [ ] **Step 4: implementar el filtro**

Extender `alreadyCompleted`:

```ts
if (action.type === ACTIONS.UNMARK_PREGUIDE) {
  return order.preguide !== true;
}
if (action.type === ACTIONS.UNMARK_PREPARED) {
  return order.prepared !== true;
}
```

- [ ] **Step 5: verificar GREEN**

Ejecutar el comando de Step 3. Expected: suite aprobada y las pruebas existentes de `MARK_*` permanecen verdes.

- [ ] **Step 6: commit de disponibilidad**

```powershell
git add src/modules/workflow/application/usecases/get-available-transitions.usecase.ts src/modules/workflow/application/usecases/get-available-transitions.usecase.spec.ts
git commit -m "feat: alternate tracking workflow actions"
```

### Task 5: Seeder exclusivo de `ABONADO ENVIO`

**Files:**
- Modify: `src/modules/workflow/infrastructure/seed/abonado-workflows.seed-data.ts`
- Test: `src/modules/workflow/infrastructure/seed/workflow.seeder.spec.ts`

- [ ] **Step 1: escribir pruebas RED del alcance**

Exigir cuatro acciones en ENVIO:

```ts
expect(envio.transitions).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      name: 'Sin preguía',
      actions: [{ type: 'UNMARK_PREGUIDE', config: {}, position: 0 }],
    }),
    expect.objectContaining({
      name: 'Sin preparar',
      actions: [{ type: 'UNMARK_PREPARED', config: {}, position: 0 }],
    }),
  ]),
);
```

Exigir que CE no reciba ninguna acción de seguimiento:

```ts
const ceTrackingTypes = ce.transitions.flatMap(({ actions }) => actions.map(({ type }) => type))
  .filter((type) => ['MARK_PREGUIDE', 'UNMARK_PREGUIDE', 'MARK_PREPARED', 'UNMARK_PREPARED'].includes(type));
expect(ceTrackingTypes).toEqual([]);
```

- [ ] **Step 2: verificar RED**

Run:

```powershell
pnpm test -- modules/workflow/infrastructure/seed/workflow.seeder.spec.ts --runInBand
```

Expected: FAIL porque faltan las dos transiciones inversas de ENVIO.

- [ ] **Step 3: agregar transiciones inversas solo a ENVIO**

Añadir junto a las positivas:

```ts
transition({
  clientId: 'transition-1eb4324c-259d-4a70-9cc7-b5e346e08a86',
  code: 'GLOBAL_ACTION_UNMARK_PREPARED',
  name: 'Sin preparar',
  effect: 'RUN_ACTIONS',
  isGlobal: true,
  excludedStateRefs: [ENVIO_WAITING_PAYMENT, ENVIO_DRAFT, ENVIO_DELIVERED, ENVIO_WAITING_STOCK, ENVIO_SCHEDULED, ENVIO_CREATED],
  positionX: -340,
  positionY: -506,
  actions: [action('UNMARK_PREPARED')],
}),
transition({
  clientId: 'transition-48ffb215-57dd-464d-a540-021caf907c19',
  code: 'GLOBAL_ACTION_UNMARK_PREGUIDE',
  name: 'Sin preguía',
  effect: 'RUN_ACTIONS',
  isGlobal: true,
  positionX: -136,
  positionY: -508,
  actions: [action('UNMARK_PREGUIDE')],
}),
```

No modificar el objeto `ABONADO CE`.

- [ ] **Step 4: verificar GREEN e idempotencia**

Ejecutar el comando de Step 2 y confirmar que `materializeWorkflowSeed` produce los mismos IDs en dos ejecuciones.

- [ ] **Step 5: commit del seeder**

```powershell
git add src/modules/workflow/infrastructure/seed
git commit -m "feat: seed inverse tracking actions for envio"
```

### Task 6: Catálogo y etiquetas frontend

**Files:**
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/workflows/types/workflow.ts`
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/workflows/components/WorkflowActionEditor.tsx`
- Test: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/workflows/components/WorkflowActionEditor.spec.tsx`

- [ ] **Step 1: escribir prueba RED de etiquetas**

Agregar ambos tipos al catálogo simulado y exigir:

```tsx
expect(screen.getByText('Quitar preguía')).toBeInTheDocument();
expect(screen.getByText('Marcar sin preparar')).toBeInTheDocument();
```

- [ ] **Step 2: verificar RED**

Run desde frontend:

```powershell
pnpm test:unit -- src/features/workflows/components/WorkflowActionEditor.spec.tsx
```

Expected: FAIL porque el tipo y la etiqueta todavía no existen.

- [ ] **Step 3: implementar tipos y etiquetas**

Añadir en `ACTIONS`:

```ts
UNMARK_PREGUIDE: 'UNMARK_PREGUIDE',
UNMARK_PREPARED: 'UNMARK_PREPARED',
```

Añadir al mapa de etiquetas:

```ts
UNMARK_PREGUIDE: 'Quitar preguía',
UNMARK_PREPARED: 'Marcar sin preparar',
```

- [ ] **Step 4: verificar GREEN**

Ejecutar el comando de Step 2. Expected: suite aprobada.

- [ ] **Step 5: commit frontend**

```powershell
git add src/features/workflows/types/workflow.ts src/features/workflows/components/WorkflowActionEditor.tsx src/features/workflows/components/WorkflowActionEditor.spec.tsx
git commit -m "feat: label inverse tracking workflow actions"
```

### Task 7: Documentación y verificación integrada

**Files:**
- Modify: `docs/sale-orders-role-matrix.md`
- Modify: `docs/sale-orders-manual-verification.md`
- Modify: `docs/superpowers/plans/2026-08-01-revertir-seguimiento-workflow.md`

- [ ] **Step 1: actualizar documentación operativa**

Reemplazar la nota que indica que la reversión no existe por la matriz definitiva:

```md
- ABONADO ENVIO permite Preguía, Sin preguía, Preparado y Sin preparar como acciones globales.
- ABONADO CE no recibe acciones globales de seguimiento en el seeder.
```

Actualizar las pruebas manuales para ejecutar las cuatro acciones en un pedido ENVIO y confirmar que ninguna aparece en CE.

- [ ] **Step 2: ejecutar búsqueda residual**

```powershell
rg -n --hidden --glob '!node_modules' --glob '!dist' "UNMARK_PREGUIDE|UNMARK_PREPARED|Sin preguía|Sin preparar" Eunoia-sistema-administrativo-b Eunoia-sistema-administrativo-f
```

Expected: tipos, runner, repositorio, disponibilidad, seeder ENVIO, frontend, pruebas y documentación; ninguna transición sembrada en el bloque CE.

- [ ] **Step 3: verificación backend enfocada**

```powershell
pnpm test -- modules/workflow/domain/factories/action.factory.spec.ts modules/workflow/adapters/in/controllers/workflows.controller.spec.ts modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts modules/workflow/application/services/sale-order-workflow-action-runner.service.spec.ts modules/workflow/application/usecases/get-available-transitions.usecase.spec.ts modules/workflow/infrastructure/seed/workflow.seeder.spec.ts --runInBand
pnpm build
```

Expected: todas las suites enfocadas y el build terminan con código 0.

- [ ] **Step 4: verificación frontend enfocada**

```powershell
pnpm test:unit -- src/features/workflows/components/WorkflowActionEditor.spec.tsx src/features/sale-orders/components/bulk/SaleOrderBulkModals.spec.tsx
pnpm build
```

Expected: pruebas y build terminan con código 0.

- [ ] **Step 5: ejecutar las suites globales y registrar deuda previa**

Backend:

```powershell
pnpm test -- --runInBand
```

Frontend:

```powershell
pnpm test:unit
pnpm lint
```

Comparar con la línea base conocida y corregir únicamente regresiones atribuibles a estas acciones.

- [ ] **Step 6: revisar estado final**

```powershell
git status --short
git branch --show-current
git -C ..\Eunoia-sistema-administrativo-f status --short
git -C ..\Eunoia-sistema-administrativo-f branch --show-current
```

Expected: ambos repositorios en `master` y sin cambios pendientes después de los commits.
