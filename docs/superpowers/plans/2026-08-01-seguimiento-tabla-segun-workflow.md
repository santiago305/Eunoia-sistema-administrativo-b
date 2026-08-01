# Workflow-Driven Order Tracking Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the order table show invoice, preguide, and preparation badges independently according to active global workflow actions, while always showing payment.

**Architecture:** The backend derives a stable `trackingCapabilities` object from active global `RUN_ACTIONS` transitions in one batched query per order read. A pure mapper translates workflow action types into booleans, and both list and detail outputs attach the result. The frontend consumes those booleans and keeps the existing badge components and visual styling.

**Tech Stack:** NestJS, TypeORM, Jest, React 19, TypeScript, Vitest, Testing Library, Tailwind CSS.

---

### Task 1: Define and test the capability model

**Files:**
- Create: `src/modules/sale-orders/application/support/sale-order-tracking-capabilities.ts`
- Create: `src/modules/sale-orders/application/support/sale-order-tracking-capabilities.spec.ts`
- Modify: `src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot.ts`
- Modify: `src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output.ts`

- [ ] **Step 1: Write the failing pure-mapper tests**

Add tests proving that an empty or unknown action set produces three `false` values, invoice enables only `invoice`, either preguide action enables only `preguide`, and either preparation action enables only `prepared`.

```ts
expect(buildSaleOrderTrackingCapabilities([])).toEqual({
  invoice: false,
  preguide: false,
  prepared: false,
});
expect(buildSaleOrderTrackingCapabilities([ACTIONS.MARK_INVOICE_SENT])).toEqual({
  invoice: true,
  preguide: false,
  prepared: false,
});
expect(buildSaleOrderTrackingCapabilities([ACTIONS.UNMARK_PREGUIDE])).toEqual({
  invoice: false,
  preguide: true,
  prepared: false,
});
expect(buildSaleOrderTrackingCapabilities([ACTIONS.UNMARK_PREPARED])).toEqual({
  invoice: false,
  preguide: false,
  prepared: true,
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `pnpm test -- sale-order-tracking-capabilities.spec.ts --runInBand`

Expected: FAIL because `sale-order-tracking-capabilities.ts` does not exist.

- [ ] **Step 3: Add the stable output type and pure mapper**

Define the shared backend contract:

```ts
export type SaleOrderTrackingCapabilities = {
  invoice: boolean;
  preguide: boolean;
  prepared: boolean;
};
```

Add `trackingCapabilities: SaleOrderTrackingCapabilities` to both `SaleOrderListItemOutput` and `SaleOrderGetOutput`. Implement `buildSaleOrderTrackingCapabilities(actionTypes)` using the action constants, with no workflow-name checks.

- [ ] **Step 4: Run the mapper test and verify GREEN**

Run: `pnpm test -- sale-order-tracking-capabilities.spec.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit the capability model**

```powershell
git add -- src/modules/sale-orders/application/support/sale-order-tracking-capabilities.ts src/modules/sale-orders/application/support/sale-order-tracking-capabilities.spec.ts src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot.ts src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output.ts
git commit -m "feat: define order tracking capabilities"
```

### Task 2: Load workflow capabilities in batch for list and detail reads

**Files:**
- Modify: `src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.ts`
- Modify: `src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts`

- [ ] **Step 1: Write failing repository tests**

Cover these observable cases:

```ts
expect(result.items[0].trackingCapabilities).toEqual({
  invoice: true,
  preguide: false,
  prepared: true,
});
expect(trackingActionQb.andWhere).toHaveBeenCalledWith("trackingTransition.isActive = true");
expect(trackingActionQb.andWhere).toHaveBeenCalledWith("trackingTransition.isGlobal = true");
expect(trackingActionQb.andWhere).toHaveBeenCalledWith("trackingTransition.effect = :trackingEffect", {
  trackingEffect: "RUN_ACTIONS",
});
```

Also prove that two orders sharing one workflow use one batched capability query and that `findById` attaches the same contract. A missing or inactive workflow must return all three values as `false`.

- [ ] **Step 2: Run repository tests and verify RED**

Run: `pnpm test -- sale-order.typeorm.repo.spec.ts --runInBand`

Expected: FAIL because list/detail outputs do not yet contain `trackingCapabilities`.

- [ ] **Step 3: Implement the batched loader**

Import `WorkflowActionEntity`, `TRANSITION_EFFECTS`, the recognized action constants, and the pure mapper. Add a private loader that:

```ts
private async loadTrackingCapabilities(
  manager: EntityManager,
  workflowIds: string[],
): Promise<Map<string, SaleOrderTrackingCapabilities>>
```

The loader must initialize every requested workflow with false capabilities, perform one query over `workflow_actions`, join its transition and workflow, require an active workflow plus an active/global/`RUN_ACTIONS` transition, restrict action types to the five recognized types, group rows by workflow id, and map each group with `buildSaleOrderTrackingCapabilities`.

- [ ] **Step 4: Attach the batch result to both read paths**

In `list`, run the capability loader once with unique `workflowIds` alongside the existing batched enrichment queries and attach:

```ts
trackingCapabilities:
  (row.workflowId && trackingCapabilitiesByWorkflowId.get(row.workflowId)) ??
  buildSaleOrderTrackingCapabilities([]),
```

In `findById`, invoke the same loader for the single workflow id and always return all three boolean keys.

- [ ] **Step 5: Run backend focused tests and build**

Run:

```powershell
pnpm test -- sale-order-tracking-capabilities.spec.ts sale-order.typeorm.repo.spec.ts --runInBand
pnpm build
```

Expected: both suites PASS and Nest build exits 0.

- [ ] **Step 6: Commit backend integration**

```powershell
git add -- src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.ts src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts
git commit -m "feat: expose workflow tracking capabilities on orders"
```

### Task 3: Render only workflow-enabled table badges

**Files:**
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/sale-orders/types/saleOrder.ts`
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.tsx`
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/sale-orders/SaleOrders.tsx`
- Modify: `D:/eunoia/Eunoia-sistema-administrativo-f/src/features/sale-orders/SaleOrders.test.tsx`

- [ ] **Step 1: Write failing component and table tests**

Extend the frontend `SaleOrder` type with an optional compatibility field:

```ts
trackingCapabilities?: {
  invoice: boolean;
  preguide: boolean;
  prepared: boolean;
};
```

Then add tests proving:

- Payment renders when all capabilities are false.
- Invoice is absent when `invoice` is false and present when true.
- Preguide and preparation render independently.
- Missing `trackingCapabilities` hides all three conditional badges.
- Existing positive/negative text and compact badge classes are preserved when enabled.

- [ ] **Step 2: Run frontend focused tests and verify RED**

Run:

```powershell
pnpm test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/SaleOrders.test.tsx
```

Expected: FAIL because badges are still rendered unconditionally.

- [ ] **Step 3: Apply independent visibility without redesigning badges**

Update `SaleOrderTrackingCell` so it returns only the enabled preguide/preparation tags:

```tsx
{order.trackingCapabilities?.preguide === true && <TrackingStatus ... />}
{order.trackingCapabilities?.prepared === true && <TrackingStatus ... />}
```

In the table column, leave payment unconditional and wrap the existing invoice badge with:

```tsx
{order.trackingCapabilities?.invoice === true && (
  <span className={existingInvoiceClasses}>...</span>
)}
```

Do not add workflow requests, workflow-name conditions, buttons, checkboxes, filters, or new styling.

- [ ] **Step 4: Run focused tests and frontend build**

Run:

```powershell
pnpm test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/SaleOrders.test.tsx
pnpm build
```

Expected: focused tests PASS and Vite production build exits 0.

- [ ] **Step 5: Commit frontend rendering**

```powershell
git add -- src/features/sale-orders/types/saleOrder.ts src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.tsx src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/SaleOrders.tsx src/features/sale-orders/SaleOrders.test.tsx
git commit -m "feat: render order tracking by workflow capability"
```

### Task 4: Document manual checks and perform final verification

**Files:**
- Create: `docs/superpowers/manual-tests/2026-08-01-seguimiento-tabla-segun-workflow.md`

- [ ] **Step 1: Write the manual verification matrix**

Document exact checks for:

| Workflow configuration | Expected Seguimiento column |
| --- | --- |
| Current ABONADO CE | Payment + invoice; no preguide; no preparation |
| Current ABONADO ENVIO | Payment + invoice + preguide + preparation |
| Only preguide action added | Payment + preguide, plus any other explicitly configured capability |
| Only preparation action added | Payment + preparation, plus any other explicitly configured capability |
| No workflow or inactive workflow | Payment only |

Include steps to add/remove an action in workflow configuration, reload the order table, and verify that no code or workflow-name change is needed.

- [ ] **Step 2: Run changed-file quality checks**

Backend:

```powershell
pnpm exec eslint src/modules/sale-orders/application/support/sale-order-tracking-capabilities.ts src/modules/sale-orders/application/support/sale-order-tracking-capabilities.spec.ts src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot.ts src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output.ts src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.ts src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo.spec.ts
```

Frontend:

```powershell
pnpm exec eslint src/features/sale-orders/types/saleOrder.ts src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.tsx src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/SaleOrders.tsx src/features/sale-orders/SaleOrders.test.tsx
```

Expected: no new errors in changed files.

- [ ] **Step 3: Run final focused verification**

Backend:

```powershell
pnpm test -- sale-order-tracking-capabilities.spec.ts sale-order.typeorm.repo.spec.ts workflow.seeder.spec.ts --runInBand
pnpm build
```

Frontend:

```powershell
pnpm test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/SaleOrders.test.tsx
pnpm build
```

Expected: all focused suites pass and both production builds exit 0.

- [ ] **Step 4: Commit the manual test guide**

```powershell
git add -- docs/superpowers/manual-tests/2026-08-01-seguimiento-tabla-segun-workflow.md
git commit -m "docs: add workflow tracking table checks"
```

- [ ] **Step 5: Inspect final scope**

Run `git status --short --branch` and `git log -5 --oneline` in both repositories. Confirm that only the planned files were committed and report any pre-existing local changes separately.
