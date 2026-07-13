# Payments module backend contract

Date: 2026-07-13

Branch: `feature/payments-audit-contract`

This backend companion spec mirrors the operational contract required by the frontend payments redesign. It exists in the backend repo so API, domain and permission work can be implemented from local documentation without relying on the frontend checkout.

## Scope

Modules in scope:

- `src/modules/payments`
- `src/modules/accounts-payable`
- `src/modules/company-payment-accounts`
- `src/modules/payment-methods`
- `src/modules/access-control/application/constants/permissions-seed.ts`
- Purchase approval/history/notification integrations used by payment creation, approval and rejection.

## Authoritative Backend Rules

- Controllers expose guarded HTTP endpoints and call use cases.
- Payment state changes must live in application use cases, not controller bodies.
- Only `APPROVED` payments update paid totals, quotas or accounts payable balances.
- `SCHEDULED`, `PENDING_APPROVAL` and `REJECTED` payments do not reduce pending balances.
- Rejection is a state transition, not deletion.
- Evidence requirements are enforced by backend when `paymentMethodId` points to a method with `requiresVoucher`.
- Sensitive account data is masked unless the requester has `payment_accounts.view_sensitive`.

## Payment Output

The canonical payment output used by list/detail endpoints is:

```ts
export interface PaymentOutput {
  payDocId: string;
  method: string;
  date: Date;
  operationNumber?: string | null;
  currency: CurrencyType;
  amount: number;
  note?: string | null;
  fromDocumentType: PayDocType;
  poId?: string | null;
  quotaId?: string | null;
  accountPayableId?: string | null;
  companyPaymentAccountId?: string | null;
  paymentMethodId?: string | null;
  status: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  rejectedByUserId?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  paidByUserId?: string | null;
  scheduledByUserId?: string | null;
  scheduledAt?: Date | null;
  paidAt?: Date | null;
  paymentEvidenceFileId?: string | null;
  bankName?: string | null;
  cardLastFour?: string | null;
  operationCode?: string | null;
  isPartial?: boolean;
  companyPaymentAccountMaskedLabel?: string | null;
}
```

`poId` is nullable in persistence and must be treated as nullable by all output/input types that support manual or payable-only payments.

## Payment Statuses And Transitions

Allowed statuses:

- `SCHEDULED`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`

Allowed transitions:

| From | To | Required permission | Required use case behavior |
| --- | --- | --- | --- |
| new payment | `APPROVED` | `payments.create` and `payments.approve` | Store payment, set approval metadata, recalculate linked payable/quota. |
| new payment | `PENDING_APPROVAL` | `payments.create` | Store request, create approval/history events, notify approvers/requester. |
| new scheduled payment | `SCHEDULED` | `payments.create` and `payments.schedule` | Store schedule metadata; do not mark paid. |
| `PENDING_APPROVAL` | `APPROVED` | `payments.approve` | Approve, set paid metadata, update quota/payable, notify requester. |
| `SCHEDULED` | `APPROVED` | `payments.approve` | Execute scheduled payment, set paid metadata, update balances. |
| `PENDING_APPROVAL` | `REJECTED` | `payments.reject` | Store reason/reviewer metadata, history and notification. |

Forbidden transitions:

- `APPROVED` to `REJECTED`
- `REJECTED` to `APPROVED`
- `REJECTED` to `PENDING_APPROVAL`
- balance updates for non-approved statuses

## Payment Endpoints

Existing endpoints to preserve:

- `POST /payments`
- `GET /payments`
- `GET /payments/get-by-po/:id`
- `GET /payments/:id`
- `POST /payments/:id/approve`
- `POST /payments/:id/reject`
- `DELETE /payments/:id`

Target endpoints for later branches:

- `GET /payments/search-metadata`
- `GET /payments/recent-searches`
- `POST /payments/recent-searches`
- `GET /payments/saved-metrics`
- `POST /payments/saved-metrics`
- `DELETE /payments/saved-metrics/:id`
- `GET /payments/export-columns`
- `GET /payments/export-presets`
- `POST /payments/export-excel`
- `POST /payments/:id/evidence`
- `GET /payments/:id/evidence`
- `DELETE /payments/:id/evidence/:fileId`

## Payment Create Input

Current accepted input:

- `method`
- `date`
- `operationNumber`
- `currency`
- `amount`
- `note`
- `quotaId`
- `poId`
- `accountPayableId`
- `companyPaymentAccountId`
- `paymentMethodId`
- `scheduledAt`
- `paidAt`
- `paymentEvidenceFileId`
- `bankName`
- `cardLastFour`
- `operationCode`
- `isPartial`

Rules:

- `amount >= 0.01`
- `scheduledAt` without `paidAt` means scheduled payment.
- User without `payments.approve` creates `PENDING_APPROVAL` unless scheduling rules apply.
- User with `payments.approve` creates `APPROVED` unless scheduling rules apply.
- `accountPayableId` must be recalculated after approved creation or approval transition.
- Purchases in pending/rejected approval states cannot receive payments from users without `payments.approve`.
- Full card/account numbers are never accepted through payment creation.

## Payment List Query

Current query:

- `poId`
- `quotaId`
- `status`
- `page`
- `limit`

Target query:

- `status` as backwards-compatible single status
- `statuses` as multi-status list
- `poId`
- `quotaId`
- `accountPayableId`
- `companyPaymentAccountId`
- `paymentMethodId`
- `requestedByUserId`
- `approvedByUserId`
- `dateFrom`
- `dateTo`
- `scheduledFrom`
- `scheduledTo`
- `amountMin`
- `amountMax`
- `currency`
- `hasEvidence`
- `isPartial`
- `search`
- `sortBy`
- `sortDirection`
- `page`
- `limit`

The repository port and TypeORM implementation must accept `SCHEDULED` wherever status filters are typed.

## Accounts Payable Contract

Endpoints:

- `GET /accounts-payable`
- `POST /accounts-payable/mark-overdue`

Statuses:

- `PENDING`
- `PARTIAL`
- `PAID`
- `OVERDUE`
- `CANCELLED`

Target filters:

- `status`
- `statuses`
- `purchaseId`
- `supplierId`
- `dueFrom`
- `dueTo`
- `amountPendingMin`
- `amountPendingMax`
- `currency`
- `search`
- `page`
- `limit`

Rules:

- Recalculate from approved payments only.
- Mark overdue only when due date passed and pending amount remains.
- Partial payment leaves status `PARTIAL`.
- Fully paid obligation becomes `PAID`.

## Company Payment Account Contract

Endpoints:

- `POST /company-payment-accounts`
- `GET /company-payment-accounts/by-company/:companyId`
- `PATCH /company-payment-accounts/:id`
- `PATCH /company-payment-accounts/:id/active`

Types:

- `BANK_ACCOUNT`
- `CREDIT_CARD`
- `CASH`
- `DIGITAL_WALLET`

Rules:

- Outputs include `maskedLabel`.
- Sensitive fields are excluded or masked without `payment_accounts.view_sensitive`.
- Inactive accounts cannot be selected for new payments.
- Deactivation must account for scheduled payments that reference the account.
- Default account behavior must avoid multiple active defaults for the same company/currency/type group.

## Payment Method Contract

Endpoints:

- `POST /payment-methods`
- `GET /payment-methods`
- `GET /payment-methods/records`
- `GET /payment-methods/by-company/:companyId`
- `GET /payment-methods/by-supplier/:supplierId`
- `GET /payment-methods/:id`
- `PATCH /payment-methods/:id`
- `PATCH /payment-methods/:id/active`

Fields:

- `methodId`
- `name`
- `isActive`
- `requiresVoucher`
- `createdAt`
- `updatedAt`

Rules:

- Inactive methods cannot be selected for new payments.
- `requiresVoucher` must be enforced for payment evidence.
- Catalog methods are the source of truth for display name and voucher policy.

## Permissions

Backend guards must use these permissions:

- `payments.read`
- `payments.create`
- `payments.schedule`
- `payments.approve`
- `payments.reject`
- `payments.delete`
- `payments.attach_evidence`
- `payments.view_evidence`
- `payments.view_all`
- `payments.view_own`
- `payments.export`
- `accounts-payable.view`
- `accounts-payable.manage`
- `accounts-payable.mark_overdue`
- `payment_accounts.view`
- `payment_accounts.create`
- `payment_accounts.edit`
- `payment_accounts.disable`
- `payment_accounts.delete`
- `payment_accounts.view_sensitive`
- `payment-methods.read`
- `payment-methods.manage`

`payments.view_all` and `payments.view_own` define data scope. If a user has `payments.read` but neither data-scope permission, backend must use the least permissive behavior and return only records safely associated with the requester.

## Implementation Order

1. Add advanced list filters and fix status typing.
2. Add payment search metadata, recent searches and saved metrics.
3. Extract approve/reject controller logic into use cases.
4. Add evidence endpoints and voucher enforcement.
5. Add export endpoints.
6. Harden company payment account sensitive output.
7. Expand tests and update stale permission e2e specs.

## Backend Test Requirements

- `npm test -- payments`
- `npm test -- accounts-payable`
- focused tests for advanced list filters
- focused tests for approve/reject use cases
- focused tests for sensitive company account output
- focused tests for voucher-required evidence policy
- permission e2e tests for payment action endpoints after controller constructor updates

## Acceptance Criteria

- API supports the smart-search query contract.
- Status typing includes `SCHEDULED` in DTOs, inputs, ports and repository implementations.
- Payment approval/rejection behavior is use-case based and covered by tests.
- Accounts payable balances are recalculated only from approved payments.
- Evidence and export are permission protected.
- Company account sensitive data is never returned to unauthorized users.
- Frontend and backend use the same field names and permission names.
