# Sistema Administrativo Conectado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar compras, pagos, cuentas por pagar, recurrentes, pedidos, ingresos y tarifas/agencias para que el sistema administrativo tenga trazabilidad completa de dinero que sale y dinero que entra.

**Architecture:** Mantener los modulos existentes y cerrar las brechas con integraciones pequenas y auditables. `payments` sigue siendo egresos de compras/cuentas por pagar; `sale_payments` se formaliza como ingresos; las tarifas/agencias generan obligaciones de pago cuando corresponda. La conciliacion de saldos debe vivir en usecases reutilizables, no solo en controladores.

**Tech Stack:** NestJS + TypeORM + PostgreSQL + Jest en backend. React + Vite + TypeScript + Vitest en frontend. Patrones actuales: modulos por dominio, `UnitOfWork`, `PageShell`, `DataTable`, busqueda inteligente, permisos por accion.

## Global Constraints

- No reescribir desde cero los modulos existentes.
- Mantener separacion clara: compras = adquisiciones, pagos = egresos, cuentas por pagar = obligaciones, pedidos = ventas, ingresos = cobros recibidos.
- Todo movimiento de dinero debe tener entidad, origen, estado, usuario, fecha y evidencia cuando aplique.
- Los pagos aprobados reducen saldos; pagos programados o pendientes no reducen saldos.
- Las tarifas de envio/agencia solo generan egreso si la empresa debe pagarle a un tercero.
- Los ingresos de pedidos no deben mezclarse en `payment_documents`; deben exponerse en un modulo/vista de ingresos basada en `sale_payments`.
- Cada fase debe incluir pruebas unitarias o e2e enfocadas antes de pasar a la siguiente.

---

## 1. Estado Actual Confirmado

### Ya existe y funciona parcialmente

- Compras a credito crean cuotas y cuentas por pagar desde `CreatePurchaseOrderUsecase`.
- Cuentas por pagar listan saldos y permiten abrir el modal de pago con `poId`, `quotaId`, `accountPayableId`, moneda y monto pendiente.
- Pagos aprobados recalculan cuentas por pagar cuando entran por `POST /payments`.
- Recurrentes generan compra + cuenta por pagar del periodo y permiten registrar pago.
- Pedidos tienen pagos propios en `sale_payments` y calculan `totalPaid`, `pendingAmount` y `paymentStatus`.

### Brechas que este plan cierra

- `CreatePaymentUsecase` no recalcula cuentas por pagar por si mismo.
- `DeletePaymentUsecase` actualiza cuotas, pero no recalcula `accounts_payable`.
- Una cuota creada con `totalPaid > 0` puede dejar la cuenta por pagar sin saldo correcto.
- El modal de pagos usa metodo por nombre y no envia `paymentMethodId`.
- El modal de pagos aun requiere UUID manual cuando no viene desde una cuenta por pagar.
- Los pagos de pedidos son ingresos, pero no hay modulo central de ingresos.
- `deliveryCost`/tarifa de pedido no crea egreso ni cuenta por pagar a agencia/courier.
- No hay vista administrativa unificada de flujo de caja: ingresos vs egresos vs pendientes.

---

## 2. Modelo Administrativo Objetivo

### Egresos

```txt
Compra
-> Cuenta por pagar
-> Pago programado / pendiente / aprobado / rechazado
-> Recalculo de saldo
-> Historial y evidencia
```

### Ingresos

```txt
Pedido
-> Pago de cliente en sale_payments
-> Ingreso registrado
-> Pendiente de cobro calculado
-> Evidencia de pago
-> Reporte de ingresos
```

### Tarifas/agencias

```txt
Pedido con envio por agencia/courier
-> Tarifa cobrada al cliente
-> Obligacion a pagar a agencia si aplica
-> Cuenta por pagar de agencia o gasto logistico
-> Pago aprobado
-> Conciliacion
```

---

## 3. Filesystem Map

### Backend a modificar

- `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/create.usecase.ts`
  - Recalcular cuenta por pagar dentro del usecase cuando el pago nace aprobado.
- `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/delete.usecase.ts`
  - Recalcular cuenta por pagar al eliminar un pago aprobado.
- `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/approve.usecase.ts`
  - Mantener recalculo y ampliar cobertura de pruebas.
- `Eunoia-sistema-administrativo-b/src/modules/purchases/application/usecases/purchase-order/create.usecase.ts`
  - Recalcular cuenta por pagar cuando una cuota nace con `totalPaid > 0`.
- `Eunoia-sistema-administrativo-b/src/modules/accounts-payable/application/usecases/recalculate-account-payable.usecase.ts`
  - Mantener regla canonica de saldo.
- `Eunoia-sistema-administrativo-b/src/modules/sale-orders/application/usecases/sale-order/create.usecase.ts`
  - Mantener pagos de pedido como ingresos.
  - Generar cuenta por pagar logistica si la configuracion de agencia indica que se paga a tercero.
- `Eunoia-sistema-administrativo-b/src/modules/sale-orders/application/usecases/sale-order/update.usecase.ts`
  - Reconciliar cambios de tarifa/agencia y pagos logisticos pendientes.
- `Eunoia-sistema-administrativo-b/src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase.ts`
  - Mantener como entrada de dinero y emitir eventos/reportes de ingreso.
- `Eunoia-sistema-administrativo-b/src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity.ts`
  - Agregar campos de auditoria si faltan: `created_by_user_id`, `payment_method_id`, `company_payment_account_id` si se decide unificar catalogos.
- `Eunoia-sistema-administrativo-b/src/modules/income/*`
  - Crear modulo de ingresos, solo lectura inicialmente, basado en `sale_payments`.
- `Eunoia-sistema-administrativo-b/src/modules/logistics-payables/*`
  - Crear servicio/usecase para generar obligaciones por agencia/courier.
- `Eunoia-sistema-administrativo-b/src/modules/purchase-dashboard/*`
  - Agregar resumen de ingresos/egresos/pendientes si se decide usar dashboard existente.
- `Eunoia-sistema-administrativo-b/src/modules/access-control/application/constants/permissions-seed.ts`
  - Agregar permisos de ingresos y egresos logisticos.

### Frontend a modificar

- `Eunoia-sistema-administrativo-f/src/features/payments/components/PaymentFormModal.tsx`
  - Enviar `paymentMethodId`, selector de compra/cuenta por pagar y mejor UX.
- `Eunoia-sistema-administrativo-f/src/features/payments/pages/AccountsPayablePage.tsx`
  - Refrescar correctamente cuentas por pagar tras crear, aprobar, programar o eliminar pago.
- `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/*`
  - Diferenciar pagos de cliente, tarifa cobrada y costo real a agencia/courier.
- `Eunoia-sistema-administrativo-f/src/features/income/*`
  - Crear pagina `/ingresos` con tabla, KPIs, filtros y detalle.
- `Eunoia-sistema-administrativo-f/src/shared/services/incomeService.ts`
  - Cliente HTTP para ingresos.
- `Eunoia-sistema-administrativo-f/src/routes/config/routesPaths.ts`
  - Agregar ruta `/ingresos`.
- `Eunoia-sistema-administrativo-f/src/routes/config/routesConfig.ts`
  - Agregar permisos de ingresos.
- `Eunoia-sistema-administrativo-f/src/routes/modules/DashboardRoutes.tsx`
  - Registrar pagina de ingresos.
- `Eunoia-sistema-administrativo-f/src/shared/config/sidebarConfig.tsx`
  - Agregar acceso de navegacion.

---

## Task 1: Blindar Recalculo De Cuentas Por Pagar

**Files:**
- Modify: `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/create.usecase.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/delete.usecase.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/create.usecase.spec.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/delete.usecase.spec.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/purchases/application/usecases/purchase-order/create.usecase.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/purchases/application/usecases/purchase-order/create.usecase.spec.ts`

**Interfaces:**
- Consumes: `RecalculateAccountPayableUsecase.execute({ accountPayableId }, tx?)`
- Produces: Todo pago aprobado o eliminado actualiza saldo de `accounts_payable`.

- [ ] **Step 1: Agregar pruebas de pago aprobado**

Crear/ajustar prueba para que `CreatePaymentUsecase` con `accountPayableId` y estado `APPROVED` llame a `RecalculateAccountPayableUsecase`.

Run:

```bash
pnpm test -- create.usecase.spec.ts
```

Expected: falla porque el usecase todavia no recalcula por si mismo.

- [ ] **Step 2: Inyectar recalculador en CreatePaymentUsecase**

Agregar dependencia opcional o requerida:

```ts
private readonly recalculateAccountPayable: RecalculateAccountPayableUsecase
```

Despues de crear el pago y antes de retornar:

```ts
if (input.accountPayableId && (options?.status ?? "APPROVED") === "APPROVED") {
  await this.recalculateAccountPayable.execute({ accountPayableId: input.accountPayableId }, tx);
}
```

- [ ] **Step 3: Evitar doble responsabilidad en controller**

En `PaymentsController.create`, retirar el recalculo redundante si ya ocurre dentro del usecase. Mantener el controller enfocado en permisos, validaciones HTTP y notificaciones.

- [ ] **Step 4: Agregar pruebas de eliminacion**

Probar que `DeletePaymentUsecase` recalcula `accountPayableId` cuando elimina un pago que estaba asociado a una cuenta por pagar.

Run:

```bash
pnpm test -- delete.usecase.spec.ts
```

- [ ] **Step 5: Implementar recalculo en DeletePaymentUsecase**

Despues de `deleteById`, si `existing.accountPayableId` existe:

```ts
await this.recalculateAccountPayable.execute(
  { accountPayableId: existing.accountPayableId },
  tx,
);
```

- [ ] **Step 6: Corregir cuotas con pago inicial**

En `CreatePurchaseOrderUsecase`, cuando `quotaInput.totalPaid > 0`, crear el pago aprobado correspondiente o recalcular la cuenta por pagar inmediatamente con ese monto. La opcion recomendada es crear un `PaymentDocument APPROVED` si existe informacion de pago; si no existe, crear cuenta por pagar con `amountPaid` inicial coherente.

- [ ] **Step 7: Verificacion**

Run:

```bash
pnpm test -- create.usecase.spec.ts delete.usecase.spec.ts recalculate-account-payable.usecase.spec.ts
```

Expected: todos pasan.

---

## Task 2: Mejorar El Formulario Central De Pagos

**Files:**
- Modify: `Eunoia-sistema-administrativo-f/src/features/payments/components/PaymentFormModal.tsx`
- Create: `Eunoia-sistema-administrativo-f/src/features/payments/components/PurchasePayableSelect.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/shared/services/paymentService.ts`
- Modify: `Eunoia-sistema-administrativo-f/src/shared/services/accountsPayableService.ts`
- Test: `Eunoia-sistema-administrativo-f/test/payment-form-modal.spec.tsx`

**Interfaces:**
- Consumes: `GET /accounts-payable`, `GET /payments/search-state`, `POST /payments`
- Produces: Pagos creados con `poId`, `accountPayableId`, `quotaId`, `paymentMethodId`, `companyPaymentAccountId`.

- [ ] **Step 1: Crear test de envio de paymentMethodId**

La prueba debe seleccionar un metodo del catalogo y verificar que el payload incluye:

```ts
{
  method: "Transferencia",
  paymentMethodId: "method-uuid",
  companyPaymentAccountId: "account-uuid"
}
```

- [ ] **Step 2: Ajustar seleccion de metodo**

Cambiar estado interno para guardar `paymentMethodId` y derivar `method` desde el metodo seleccionado. Evitar depender solo del nombre.

- [ ] **Step 3: Crear selector de compra/cuenta por pagar**

`PurchasePayableSelect` debe listar cuentas por pagar pendientes/parciales y mostrar:

```txt
Compra | Proveedor | Pendiente | Vencimiento | Estado
```

Al seleccionar debe setear:

```ts
poId
quotaId
accountPayableId
currency
amount
```

- [ ] **Step 4: Mantener soporte manual controlado**

Permitir UUID manual solo en modo avanzado o cuando no hay cuentas cargadas. Mostrar error claro si falta compra asociada.

- [ ] **Step 5: Verificacion frontend**

Run:

```bash
pnpm test -- payment-form-modal.spec.tsx
pnpm test -- accountPayableSmartSearch.test.ts paymentSmartSearch.test.ts
```

Expected: todos pasan.

---

## Task 3: Formalizar Ingresos De Pedidos

**Files:**
- Create: `Eunoia-sistema-administrativo-b/src/modules/income/income.module.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/income/adapters/in/controllers/income.controller.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/income/application/usecases/list-income.usecase.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/income/application/usecases/get-income-summary.usecase.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/income/application/dtos/income.output.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/app.module.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/access-control/application/constants/permissions-seed.ts`

**Interfaces:**
- Consumes: `sale_payments`, `sale_orders`, `clients`, `company_payment_accounts`.
- Produces: `GET /income`, `GET /income/summary`.

- [ ] **Step 1: Agregar permisos**

Agregar:

```ts
page.income.view
income.read
income.export
income.view_all
income.view_own
```

- [ ] **Step 2: Crear usecase de listado**

Debe devolver ingresos con:

```ts
{
  incomeId: string;
  saleOrderId: string;
  clientName: string;
  amount: number;
  method: string;
  companyPaymentAccountId: string | null;
  companyPaymentAccountLabel: string | null;
  operationNumber: string | null;
  date: string;
  createdAt: string;
  evidenceUrl: string | null;
}
```

- [ ] **Step 3: Crear resumen**

`GET /income/summary` debe devolver:

```ts
{
  totalCollected: number;
  totalPending: number;
  ordersPaid: number;
  ordersPending: number;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  byAccount: Array<{ accountId: string | null; label: string; amount: number; count: number }>;
}
```

- [ ] **Step 4: Pruebas backend**

Crear pruebas para:

- Listar ingresos por fecha.
- Filtrar por metodo/cuenta.
- Resumen suma `sale_payments.amount`.
- Pendiente se calcula con `sale_orders.total - SUM(sale_payments.amount)`.

Run:

```bash
pnpm test -- income
```

---

## Task 4: Crear Pantalla `/ingresos`

**Files:**
- Create: `Eunoia-sistema-administrativo-f/src/features/income/IncomePage.tsx`
- Create: `Eunoia-sistema-administrativo-f/src/features/income/components/IncomeKpiStrip.tsx`
- Create: `Eunoia-sistema-administrativo-f/src/features/income/components/IncomeTable.tsx`
- Create: `Eunoia-sistema-administrativo-f/src/features/income/components/IncomeSmartSearchPanel.tsx`
- Create: `Eunoia-sistema-administrativo-f/src/features/income/types/income.types.ts`
- Create: `Eunoia-sistema-administrativo-f/src/features/income/utils/incomeSmartSearch.ts`
- Create: `Eunoia-sistema-administrativo-f/src/shared/services/incomeService.ts`
- Modify: `Eunoia-sistema-administrativo-f/src/routes/config/routesPaths.ts`
- Modify: `Eunoia-sistema-administrativo-f/src/routes/config/routesConfig.ts`
- Modify: `Eunoia-sistema-administrativo-f/src/routes/modules/DashboardRoutes.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/shared/config/sidebarConfig.tsx`

**Interfaces:**
- Consumes: `GET /income`, `GET /income/summary`
- Produces: pantalla administrativa de ingresos.

- [ ] **Step 1: Crear servicio HTTP**

Implementar:

```ts
listIncome(query)
getIncomeSummary(query)
```

- [ ] **Step 2: Crear tabla**

Columnas minimas:

```txt
Pedido
Cliente
Monto
Metodo
Cuenta
Operacion
Fecha
Evidencia
```

- [ ] **Step 3: Crear KPIs**

KPIs:

```txt
Ingresado
Pendiente de cobro
Pedidos pagados
Pedidos pendientes
```

- [ ] **Step 4: Agregar busqueda inteligente**

Filtros:

```txt
Cliente
Pedido
Metodo
Cuenta
Fecha
Monto
Con evidencia
```

- [ ] **Step 5: Registrar ruta y permisos**

Ruta:

```ts
income: "/ingresos"
```

Permisos:

```ts
["page.income.view", "income.read"]
```

- [ ] **Step 6: Verificacion frontend**

Run:

```bash
pnpm test -- income
pnpm test -- permissions-routing.spec.ts
```

---

## Task 5: Conectar Tarifas/Agencias Como Egresos Logisticos

**Files:**
- Create: `Eunoia-sistema-administrativo-b/src/modules/logistics-payables/logistics-payables.module.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/logistics-payables/application/usecases/create-logistics-payable-for-sale-order.usecase.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/logistics-payables/application/usecases/reconcile-logistics-payable-for-sale-order.usecase.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/sale-orders/application/usecases/sale-order/create.usecase.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/sale-orders/application/usecases/sale-order/update.usecase.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/agencies/*`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/accounts-payable/*`

**Interfaces:**
- Consumes: pedido con `agencySubsidiaryId`, `agencyDetail`, `deliveryCost`.
- Produces: cuenta por pagar logistica cuando la agencia/courier debe recibir dinero.

- [ ] **Step 1: Definir regla de negocio**

Agregar configuracion en agencia/sucursal:

```ts
generatesPayable: boolean;
payableSupplierId?: string;
payableDescription?: string;
```

Si `generatesPayable = false`, `deliveryCost` solo queda como parte del pedido.

- [ ] **Step 2: Crear usecase de egreso logistico**

Para pedido con agencia pagable:

```ts
CreateAccountPayableUsecase.execute({
  purchaseId: logisticsPurchaseId,
  supplierId: payableSupplierId,
  description: `Envio pedido ${serie}-${correlative}`,
  currency: "PEN",
  amountTotal: deliveryCost,
  dueDate: deliveryDate ?? scheduleDate ?? new Date(),
  createdByUserId,
})
```

Nota: como `accounts_payable` exige `purchaseId`, crear una compra interna de tipo `SERVICE` o `LOGISTICS` para representar el egreso. No usar `saleOrderId` dentro de `accounts_payable` hasta tener migracion dedicada.

- [ ] **Step 3: Registrar relacion pedido-egreso**

Crear tabla ligera:

```txt
sale_order_logistics_payables
- id
- sale_order_id
- purchase_id
- account_payable_id
- agency_subsidiary_id
- amount
- status
- created_at
- updated_at
```

- [ ] **Step 4: Reconciliar cambios**

Si cambia agencia o tarifa:

- Si no hay pagos aprobados, actualizar/cancelar cuenta por pagar.
- Si ya hay pagos aprobados, bloquear reduccion destructiva y pedir ajuste manual.

- [ ] **Step 5: Pruebas**

Casos:

- Pedido sin agencia pagable no crea egreso.
- Pedido con agencia pagable crea compra interna + cuenta por pagar.
- Cambio de tarifa actualiza cuenta pendiente.
- Tarifa con pago aprobado no se reduce silenciosamente.

Run:

```bash
pnpm test -- sale-order create.usecase.spec.ts update.usecase.spec.ts logistics-payables
```

---

## Task 6: Ajustar UI De Pedidos Para Tarifa Cobrada Vs Costo A Agencia

**Files:**
- Modify: `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/SaleOrderShippingSection.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/SaleOrderTotalsSection.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/SaleOrderPaymentCards.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/saleOrderEditorForm.ts`
- Test: `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx`

**Interfaces:**
- Consumes: catalogo de agencia con regla `generatesPayable`.
- Produces: formulario que diferencia cobro al cliente y egreso logistico.

- [ ] **Step 1: Renombrar copy visual**

En UI usar:

```txt
Tarifa cobrada al cliente
Costo a pagar a agencia
```

Si ambos son iguales, precargar el costo con la tarifa.

- [ ] **Step 2: Mostrar impacto administrativo**

Cuando la agencia genera egreso, mostrar indicador:

```txt
Generara cuenta por pagar logistica
```

- [ ] **Step 3: No mezclar pago de delivery como ingreso separado sin claridad**

Los pagos del cliente siguen sumando contra total del pedido. Si se registra un pago especificamente de delivery, marcarlo con nota/etiqueta, pero mantenerlo como ingreso.

- [ ] **Step 4: Pruebas frontend**

Run:

```bash
pnpm test -- SaleOrderShippingSection.spec.tsx SaleOrderPaymentCards.spec.tsx saleOrderEditorForm.spec.ts
```

---

## Task 7: Dashboard Administrativo De Flujo De Dinero

**Files:**
- Create: `Eunoia-sistema-administrativo-b/src/modules/admin-finance/admin-finance.module.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/admin-finance/application/usecases/get-admin-finance-summary.usecase.ts`
- Create: `Eunoia-sistema-administrativo-b/src/modules/admin-finance/adapters/in/controllers/admin-finance.controller.ts`
- Create: `Eunoia-sistema-administrativo-f/src/features/admin-finance/AdminFinancePage.tsx`
- Create: `Eunoia-sistema-administrativo-f/src/shared/services/adminFinanceService.ts`

**Interfaces:**
- Consumes: `accounts_payable`, `payment_documents`, `sale_payments`, `sale_orders`.
- Produces: vista consolidada de caja administrativa.

- [ ] **Step 1: Crear endpoint resumen**

`GET /admin-finance/summary`:

```ts
{
  income: {
    collected: number;
    pending: number;
  };
  expenses: {
    paid: number;
    pending: number;
    overdue: number;
    scheduled: number;
  };
  net: {
    collectedMinusPaid: number;
    projectedAfterPending: number;
  };
}
```

- [ ] **Step 2: Crear endpoint movimientos**

`GET /admin-finance/movements` debe unir en una respuesta normalizada:

```ts
{
  type: "INCOME" | "EXPENSE";
  source: "SALE_ORDER" | "PURCHASE" | "RECURRING_PURCHASE" | "LOGISTICS";
  sourceId: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
}
```

- [ ] **Step 3: Crear UI**

La pantalla debe tener:

- KPIs de ingresos/egresos.
- Tabla de movimientos.
- Filtros por fecha, tipo, estado, metodo/cuenta.
- Enlaces a pedido, compra, cuenta por pagar o pago.

- [ ] **Step 4: Pruebas**

Run:

```bash
pnpm test -- admin-finance
```

---

## Task 8: Evidencias Y Auditoria Consistente

**Files:**
- Modify: `Eunoia-sistema-administrativo-b/src/modules/purchase-attachments/*`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/sale-order-attachments/*`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/payments/application/usecases/payment/*`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/sale-orders/application/usecases/sale-order/*`
- Modify: `Eunoia-sistema-administrativo-f/src/features/payments/components/PaymentEvidenceModal.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/features/sale-orders/components/editor/*`

**Interfaces:**
- Consumes: evidencias existentes de compras y pedidos.
- Produces: historial claro por movimiento de dinero.

- [ ] **Step 1: Definir tipos de evidencia**

Mantener:

```txt
PAYMENT_PROOF
INVOICE
RECEIPT
DELIVERY_NOTE
SERVICE_EVIDENCE
OTHER
```

Agregar para pedidos si falta:

```txt
SALE_PAYMENT_PROOF
SHIPPING_PROOF
```

- [ ] **Step 2: Registrar historial**

Eventos minimos:

```txt
INCOME_REGISTERED
INCOME_EVIDENCE_ATTACHED
LOGISTICS_PAYABLE_CREATED
LOGISTICS_PAYABLE_UPDATED
PAYMENT_APPROVED
PAYMENT_DELETED
PAYABLE_RECALCULATED
```

- [ ] **Step 3: Pruebas**

Verificar que cada accion relevante deja evento y metadata con monto, usuario, origen y evidencia.

---

## Task 9: Permisos Y Navegacion

**Files:**
- Modify: `Eunoia-sistema-administrativo-b/src/modules/access-control/application/constants/permissions-seed.ts`
- Modify: `Eunoia-sistema-administrativo-b/src/modules/access-control/application/constants/permissions-seed.spec.ts`
- Modify: `Eunoia-sistema-administrativo-f/src/routes/config/routesConfig.ts`
- Modify: `Eunoia-sistema-administrativo-f/src/shared/config/sidebarConfig.tsx`
- Modify: `Eunoia-sistema-administrativo-f/test/permissions-routing.spec.ts`

**Permisos nuevos:**

```txt
page.income.view
income.read
income.export
income.view_all
income.view_own
page.admin-finance.view
admin_finance.read
admin_finance.export
logistics_payables.view
logistics_payables.manage
```

- [ ] **Step 1: Agregar permisos backend**
- [ ] **Step 2: Agregar rutas frontend**
- [ ] **Step 3: Agregar sidebar**
- [ ] **Step 4: Probar rutas protegidas**

Run:

```bash
pnpm test -- permissions-seed.spec.ts
pnpm test -- permissions-routing.spec.ts
```

---

## Task 10: Pruebas Integrales De Flujo Administrativo

**Files:**
- Create: `Eunoia-sistema-administrativo-b/test/admin-finance-flow.e2e-spec.ts`
- Create: `Eunoia-sistema-administrativo-f/test/admin-finance-flow.spec.tsx`
- Modify: `pruebas manuales.md`

**Flujos obligatorios:**

- [ ] **Compra a credito sin pago**

Expected:

```txt
Compra creada
Cuenta por pagar PENDING
/pagos no muestra pago aprobado
/cuentas-por-pagar muestra pendiente completo
```

- [ ] **Compra con pago parcial**

Expected:

```txt
Pago APPROVED
Cuenta por pagar PARTIAL
amountPaid = monto pago
amountPending = total - pago
```

- [ ] **Compra recurrente**

Expected:

```txt
Recurrente vencida
Genera compra
Genera cuenta por pagar
Registrar pago aprobado
Cuenta por pagar PAID
```

- [ ] **Pedido con pago de cliente**

Expected:

```txt
Pedido creado
sale_payments registra ingreso
/ingresos muestra ingreso
Pedido calcula totalPaid y pendingAmount
```

- [ ] **Pedido con agencia pagable**

Expected:

```txt
Pedido creado con deliveryCost
Cuenta por pagar logistica creada
/cuentas-por-pagar muestra egreso a agencia
Pago a agencia reduce saldo
```

- [ ] **Dashboard administrativo**

Expected:

```txt
Ingresos cobrados = suma sale_payments
Egresos pagados = pagos APPROVED
Pendiente por cobrar = pedidos pendientes
Pendiente por pagar = accounts_payable pendientes/parciales/vencidas
```

---

## Orden De Implementacion Recomendado

1. Task 1: Blindar saldos de cuentas por pagar.
2. Task 2: Mejorar formulario de pagos.
3. Task 3: Backend de ingresos.
4. Task 4: Frontend de ingresos.
5. Task 5: Egresos logisticos por agencia/courier.
6. Task 6: UI de pedidos para tarifa/costo logistico.
7. Task 7: Dashboard administrativo.
8. Task 8: Evidencias e historial.
9. Task 9: Permisos y navegacion.
10. Task 10: Pruebas integrales.

---

## Criterios De Aceptacion Final

- Una compra no pagada aparece como cuenta por pagar pendiente.
- Una compra pagada parcialmente aparece como parcial en cuentas por pagar.
- Un pago aprobado reduce saldo inmediatamente.
- Un pago eliminado restaura saldo correctamente.
- Una compra recurrente genera cuenta por pagar y se puede pagar desde pagos.
- Un pedido con pago de cliente aparece como ingreso.
- El modulo `/ingresos` muestra dinero entrante de pedidos.
- La tarifa/agencia puede generar egreso si la empresa debe pagar a courier/agencia.
- Los pagos a agencia aparecen en cuentas por pagar y pagos como egresos.
- El dashboard administrativo muestra ingresos, egresos, pendientes por cobrar y pendientes por pagar.
- Todos los movimientos relevantes tienen evidencia o historial cuando aplica.

---

## Verification Commands

Backend:

```bash
cd Eunoia-sistema-administrativo-b
pnpm test -- payments accounts-payable recurring-purchases sale-orders income admin-finance
pnpm test:e2e -- admin-finance-flow.e2e-spec.ts
```

Frontend:

```bash
cd Eunoia-sistema-administrativo-f
pnpm test -- payment-form-modal income saleOrders-routing permissions-routing
```

Manual:

```txt
1. Crear compra a credito y confirmar cuenta por pagar pendiente.
2. Registrar pago parcial y confirmar saldo parcial.
3. Crear recurrente vencida y registrar pago.
4. Crear pedido con pago de cliente y confirmar ingreso.
5. Crear pedido con agencia pagable y confirmar egreso logistico.
6. Revisar dashboard administrativo.
```

---

## Riesgos Y Decisiones Pendientes

- `accounts_payable` hoy exige `purchaseId`; para egresos logisticos conviene crear compra interna de servicio/logistica antes de intentar redisenar la tabla.
- Hay que confirmar con negocio si `deliveryCost` representa siempre tarifa cobrada al cliente, costo real a agencia, o ambos.
- Si una agencia cobra diferente a lo que se cobra al cliente, el formulario debe guardar dos importes.
- Los ingresos no deben aprobarse como egresos; necesitan permisos y auditoria propia.
- Si se quiere caja/bancos real, luego debe agregarse conciliacion por cuenta, pero eso queda fuera de esta fase.

