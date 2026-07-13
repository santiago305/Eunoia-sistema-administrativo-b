import {
  buildPaymentSearchLabel,
  hasPaymentSearchCriteria,
  PAYMENT_CURRENCY_SEARCH_OPTIONS,
  PAYMENT_STATUS_SEARCH_OPTIONS,
  sanitizePaymentSearchSnapshot,
} from "./payment-search.utils";
import {
  PaymentSearchFields,
  PaymentSearchOperators,
} from "../dtos/payment-search/payment-search-snapshot";

describe("payment-search.utils", () => {
  it("sanitizes payment search snapshots and orders supported rules", () => {
    const snapshot = sanitizePaymentSearchSnapshot({
      q: "  op-123  ",
      filters: [
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          values: ["APPROVED", "APPROVED", "REJECTED", ""],
        },
        {
          field: PaymentSearchFields.AMOUNT,
          operator: PaymentSearchOperators.GTE,
          value: "100.50",
        },
        {
          field: PaymentSearchFields.PAID_AT,
          operator: PaymentSearchOperators.BETWEEN,
          range: { start: "2026-07-20", end: "2026-07-10" },
        },
        {
          field: "unsupported",
          operator: PaymentSearchOperators.EQ,
          value: "ignored",
        } as any,
      ],
    });

    expect(snapshot).toEqual({
      q: "op-123",
      filters: [
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          mode: "include",
          values: ["APPROVED", "REJECTED"],
        },
        {
          field: PaymentSearchFields.AMOUNT,
          operator: PaymentSearchOperators.GTE,
          value: "100.50",
        },
        {
          field: PaymentSearchFields.PAID_AT,
          operator: PaymentSearchOperators.BETWEEN,
          range: { start: "2026-07-10", end: "2026-07-20" },
        },
      ],
    });
  });

  it("builds labels using payment catalogs", () => {
    const snapshot = sanitizePaymentSearchSnapshot({
      filters: [
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          values: ["SCHEDULED"],
        },
        {
          field: PaymentSearchFields.CURRENCY,
          operator: PaymentSearchOperators.IN,
          values: ["PEN"],
        },
      ],
    });

    const label = buildPaymentSearchLabel(snapshot, {
      statuses: new Map(PAYMENT_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      currencies: new Map(PAYMENT_CURRENCY_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    });

    expect(label).toBe("Estado: Programado | Moneda: Soles");
    expect(hasPaymentSearchCriteria(snapshot)).toBe(true);
    expect(hasPaymentSearchCriteria({ filters: [] })).toBe(false);
  });
});
