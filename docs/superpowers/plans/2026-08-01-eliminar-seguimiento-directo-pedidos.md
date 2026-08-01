# Eliminar seguimiento directo de Pedidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eliminar la escritura directa de preguía y preparación y dejar las acciones globales de workflow como única fuente de verdad.

**Architecture:** los booleanos `preguide` y `prepared` permanecen en `sale_orders`, pero solo `MARK_PREGUIDE` y `MARK_PREPARED` podrán cambiarlos. Backend retirará rutas, caso de uso, DTO, permisos y método masivo directo; frontend retirará controles y servicios paralelos y conservará indicadores de solo lectura y los selectores existentes de acciones globales.

**Tech Stack:** NestJS 10, TypeORM, Jest, React 19, TypeScript, Vitest/Testing Library, pnpm.

---

### Task 1: Fijar el contrato backend de fuente única

**Files:**
- Modify: `src/modules/access-control/application/constants/permissions-seed.spec.ts`
- Modify: `test/sale-orders-permissions.e2e-spec.ts`
- Modify: `src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.spec.ts`
- Modify: `src/modules/workflow/application/services/sale-order-workflow-action-runner.service.spec.ts`

- [ ] **Step 1: hacer fallar el catálogo de permisos**

Cambiar las expectativas para exigir 37 permisos de Pedidos, ausencia de los dos códigos dedicados y presencia de ambos en `DEPRECATED_PERMISSION_CODES`:

```ts
expect(SALE_ORDER_PERMISSIONS).toHaveLength(37);
expect(SALE_ORDER_PERMISSION_CODES).not.toContain('sale_orders.preguide.update');
expect(SALE_ORDER_PERMISSION_CODES).not.toContain('sale_orders.prepared.update');
expect(DEPRECATED_PERMISSION_CODES).toEqual(expect.arrayContaining([
  'sale_orders.preguide.update',
  'sale_orders.prepared.update',
]));
```

- [ ] **Step 2: hacer fallar el contrato de rutas**

En la prueba del controlador, inspeccionar los métodos expuestos y exigir que ninguna ruta termine en `tracking`:

```ts
const trackingRoutes = Object.getOwnPropertyNames(SaleOrdersController.prototype)
  .map((key) => Reflect.getMetadata(PATH_METADATA, SaleOrdersController.prototype[key]))
  .filter((path): path is string => typeof path === 'string');
expect(trackingRoutes).not.toContain('bulk/tracking');
expect(trackingRoutes).not.toContain(':id/tracking');
```

- [ ] **Step 3: hacer fallar el contrato del ejecutor global**

Configurar un repositorio doble que exponga tanto `setTrackingByIds` como los métodos históricos y exigir que la acción global invoque únicamente el método específico:

```ts
const saleOrders = {
  setTrackingByIds: jest.fn(),
  markPreguide: jest.fn(),
  markPrepared: jest.fn(),
};

await runner.run(
  { id: 'order-1', warehouseId: null } as any,
  [{ id: 'a1', transitionId: 't1', type: 'MARK_PREGUIDE', config: {}, position: 0 } as any],
  tx,
);

expect(saleOrders.markPreguide).toHaveBeenCalledWith('order-1', tx);
expect(saleOrders.setTrackingByIds).not.toHaveBeenCalled();
```

Repetir para `MARK_PREPARED`.

- [ ] **Step 4: ejecutar las pruebas y confirmar RED**

Run:

```powershell
pnpm test -- permissions-seed.spec.ts sale-orders.controller.spec.ts sale-order-workflow-action-runner.service.spec.ts --runInBand
pnpm test:e2e -- sale-orders-permissions.e2e-spec.ts --runInBand
```

Expected: FAIL porque los permisos, rutas y `setTrackingByIds` todavía existen.

### Task 2: Retirar la vía directa del backend

**Files:**
- Modify: `src/modules/sale-orders/application/constants/sale-order-permissions.ts`
- Modify: `src/modules/access-control/infrastructure/seed/access-control.seeder.ts`
- Modify: `src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.ts`
- Delete: `src/modules/sale-orders/adapters/in/dtos/http-sale-order-tracking.dto.ts`
- Delete: `src/modules/sale-orders/adapters/in/dtos/http-sale-order-tracking.dto.spec.ts`
- Delete: `src/modules/sale-orders/application/usecases/sale-order/set-sale-orders-tracking.usecase.ts`
- Delete: `src/modules/sale-orders/application/usecases/sale-order/set-sale-orders-tracking.usecase.spec.ts`
- Modify: `src/modules/sale-orders/composition/container.ts`
- Modify: `src/modules/sale-orders/domain/ports/sale-order.repository.ts`
- Modify: `src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.ts`
- Modify: `src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts`
- Modify: `src/modules/workflow/application/services/sale-order-workflow-action-runner.service.ts`

- [ ] **Step 1: retirar permisos y marcarlos como obsoletos**

Eliminar ambas entradas de `SALE_ORDER_PERMISSIONS` y añadir sus códigos al arreglo de obsoletos:

```ts
export const DEPRECATED_PERMISSION_CODES = [
  'sale_orders.preguide.update',
  'sale_orders.prepared.update',
];
```

Esto conserva relaciones históricas y hace que el seeder establezca `is_active=false`.

- [ ] **Step 2: eliminar rutas, DTO y caso de uso**

Retirar imports, inyección opcional y métodos `bulkTracking`/`setTracking` del controlador. Retirar `SetSaleOrdersTrackingUsecase` del contenedor y borrar los cuatro archivos dedicados.

- [ ] **Step 3: retirar el método directo del repositorio**

Eliminar `setTrackingByIds` del puerto y de TypeORM, junto con las pruebas que validaban auditorías `preguide_on/off` y `prepared_on/off`. Mantener sin cambios:

```ts
markPreguide(saleOrderId: string, tx?: TransactionContext): Promise<void>;
markPrepared(saleOrderId: string, tx?: TransactionContext): Promise<void>;
```

- [ ] **Step 4: restaurar las acciones globales**

Simplificar el ejecutor para que no cree una identidad `'system'` ni invoque auditoría directa:

```ts
case 'MARK_PREGUIDE':
  await this.saleOrderRepo.markPreguide(saleOrderId, tx);
  break;
case 'MARK_PREPARED':
  await this.saleOrderRepo.markPrepared(saleOrderId, tx);
  break;
```

- [ ] **Step 5: conservar la autorización de acciones globales**

Mantener `sale_orders.execute_workflow_action` en `POST /sale-orders/bulk/execute-workflow` cuando `mode` sea `global_action`. No agregar los permisos retirados a ninguna acción de workflow.

- [ ] **Step 6: conservar migraciones históricas**

No borrar `20260731131000-harden-sale-order-tracking-flags.ts` ni `20260731132000-allow-sale-order-tracking-audit-actions.ts`. Mantener ambas registradas en `typeorm.config.ts`, ya que pueden estar aplicadas y sus restricciones no habilitan una segunda vía HTTP.

- [ ] **Step 7: ejecutar pruebas backend y confirmar GREEN**

Run:

```powershell
pnpm test -- permissions-seed.spec.ts sale-orders.controller.spec.ts sale-order-workflow-action-runner.service.spec.ts sale-order.typeorm.repo.spec.ts --runInBand
pnpm test:e2e -- sale-orders-permissions.e2e-spec.ts --runInBand
pnpm build
```

Expected: todas las suites finalizan con código 0 y el build compila sin referencias a la vía directa.

- [ ] **Step 8: commit backend**

```powershell
git add src test docs
git commit -m "refactor: use workflows for sale order tracking"
```

### Task 3: Fijar el contrato frontend de solo lectura

**Files:**
- Modify: `src/features/sale-orders/SaleOrders.test.tsx`
- Modify: `src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx`
- Modify: `src/features/sale-orders/permissions/saleOrderPermissions.spec.ts`

- [ ] **Step 1: hacer fallar la barra masiva**

Con permisos legacy presentes en la sesión, exigir que no aparezca una acción separada de Seguimiento:

```ts
expect(screen.queryByRole('button', { name: /seguimiento/i })).not.toBeInTheDocument();
```

La prueba debe conservar `sale_orders.execute_workflow_action` y comprobar que “Cambiar estado” continúa disponible.

- [ ] **Step 2: hacer fallar la columna interactiva**

Renderizar el indicador con las propiedades legacy mediante un objeto tipado como `any`, para demostrar que ya no deben activar botones:

```tsx
render(<SaleOrderTrackingCell {...({
  order: { preguide: false, prepared: false },
  canUpdatePreguide: true,
  canUpdatePrepared: true,
  onChange: vi.fn(),
} as any)} />);

expect(screen.queryAllByRole('button')).toHaveLength(0);
expect(screen.getByText('Sin preguía')).toBeInTheDocument();
expect(screen.getByText('Sin preparar')).toBeInTheDocument();
```

- [ ] **Step 3: hacer fallar Envío y permisos**

Exigir que Envío muestre ambos estados sin botones y que el catálogo frontend no contenga `preguideUpdate` ni `preparedUpdate`.

- [ ] **Step 4: ejecutar pruebas y confirmar RED**

Run:

```powershell
pnpm test:unit -- src/features/sale-orders/SaleOrders.test.tsx src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx src/features/sale-orders/permissions/saleOrderPermissions.spec.ts
```

Expected: FAIL porque siguen existiendo los controles directos y la acción masiva independiente.

### Task 4: Retirar la vía directa del frontend

**Files:**
- Modify: `src/features/sale-orders/SaleOrders.tsx`
- Modify: `src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.tsx`
- Delete: `src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.tsx`
- Delete: `src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx`
- Modify: `src/features/sale-orders/components/bulk/SaleOrderBulkActionsBar.tsx`
- Modify: `src/features/sale-orders/components/bulk/SaleOrderBulkActionsBar.spec.tsx`
- Modify: `src/features/sale-orders/components/bulk/index.ts`
- Modify: `src/features/sale-orders/components/SaleOrderDetailsModal.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderEditor.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderShippingSection.tsx`
- Modify: `src/features/sale-orders/permissions/saleOrderPermissions.ts`
- Modify: `src/features/sale-orders/permissions/useSaleOrderCapabilities.ts`
- Modify: `src/shared/services/APIs.ts`
- Modify: `src/shared/services/saleOrderService.ts`
- Delete: `src/shared/services/saleOrderService.tracking.spec.ts`

- [ ] **Step 1: convertir Seguimiento en visualización pura**

Reducir `SaleOrderTrackingCell` a una interfaz sin permisos ni callbacks:

```ts
type SaleOrderTrackingCellProps = {
  order: Pick<SaleOrder, 'preguide' | 'prepared'>;
};
```

Renderizar los mismos badges visuales “Con/Sin preguía” y “Preparado/Sin preparar”, sin `button`, debounce, loading, petición ni mutación optimista.

- [ ] **Step 2: retirar la acción masiva paralela**

Eliminar estado `bulkTrackingOpen`, handler `handleBulkTracking`, import y render de `SaleOrderBulkTrackingModal`, además de `onOpenTracking` y `canTracking` en la barra. Mantener “Cambiar estado”, que ya contiene el modo `global_action`.

- [ ] **Step 3: retirar controles directos del editor**

Eliminar `trackingCapabilities`, callbacks y estado mutable de seguimiento. Pasar al bloque Envío solo los valores del pedido:

```tsx
tracking={{
  preguide: order?.preguide === true,
  prepared: order?.prepared === true,
}}
```

`SaleOrderShippingSection` renderiza `SaleOrderTrackingCell` únicamente como información.

- [ ] **Step 4: retirar permisos y cliente HTTP**

Eliminar constantes/capacidades `preguideUpdate`, `preparedUpdate`, `canUpdatePreguide`, `canUpdatePrepared` y `canBulkUpdateTracking`. Eliminar `tracking`, `bulkTracking`, `setSaleOrderTracking` y `bulkSetSaleOrdersTracking` de servicios y API.

- [ ] **Step 5: ejecutar pruebas frontend y confirmar GREEN**

Run:

```powershell
pnpm test:unit -- src/features/sale-orders/SaleOrders.test.tsx src/features/sale-orders/components/bulk src/features/sale-orders/components/sale-order src/features/sale-orders/components/editor src/features/sale-orders/permissions
pnpm build
```

Expected: pruebas y build terminan con código 0; no quedan llamadas a `/tracking`.

- [ ] **Step 6: commit frontend**

```powershell
git add src
git commit -m "refactor: show sale order tracking from workflows"
```

### Task 5: Documentación y verificación integrada

**Files:**
- Modify: `docs/sale-orders-role-matrix.md`
- Modify: `README.md`
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/README.md`
- Modify: `D:/eunoia/docs/sale-orders-manual-verification.md`

- [ ] **Step 1: actualizar documentación operativa**

Documentar que `sale_orders.execute_workflow_action` autoriza Preguía y Preparado, que los indicadores son de solo lectura y que la reversión se añadirá mediante acciones globales inversas. Eliminar referencias a los dos permisos y a `/tracking`.

- [ ] **Step 2: ejecutar búsqueda residual**

Run desde `D:\eunoia`:

```powershell
rg -n --hidden --glob '!node_modules' --glob '!dist' "bulk/tracking|/tracking|sale_orders\.preguide\.update|sale_orders\.prepared\.update|setTrackingByIds|bulkSetSaleOrdersTracking|setSaleOrderTracking|SaleOrderBulkTrackingModal" Eunoia-sistema-administrativo-b Eunoia-sistema-administrativo-f docs
```

Expected: solo aparecen migraciones históricas, la lista de permisos obsoletos y documentos históricos que deban conservar trazabilidad; ninguna referencia ejecutable.

- [ ] **Step 3: verificación completa backend**

```powershell
pnpm test -- --runInBand
pnpm build
```

- [ ] **Step 4: verificación completa frontend**

```powershell
pnpm test:unit
pnpm lint
pnpm build
```

- [ ] **Step 5: revisar estado y commits**

```powershell
git status --short
git log -3 --oneline
git -C ..\Eunoia-sistema-administrativo-f status --short
git -C ..\Eunoia-sistema-administrativo-f log -3 --oneline
```

Expected: backend y frontend permanecen en `master`; solo pueden quedar cambios ajenos previamente identificados fuera de ambos repositorios.
