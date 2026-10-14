import { normalizeIncomeFilters } from "./income-filter.input";

describe("normalizeIncomeFilters reconciliation dimension", () => {
  it("preserves reconciliation status as an independent filter from financial status", () => {
    expect(normalizeIncomeFilters({
      status: "POSTED",
      filters: JSON.stringify([{ field: "reconciliationStatus", operator: "in", values: ["PARTIALLY_RECONCILED"] }]),
    })).toMatchObject({
      status: "POSTED",
      filters: [{ field: "reconciliationStatus", operator: "in", values: ["PARTIALLY_RECONCILED"] }],
    });
  });

  it("preserves the available customer-credit filter independently from payment status", () => {
    expect(normalizeIncomeFilters({
      status: "POSTED",
      filters: [{ field: "customerCreditStatus", operator: "in", values: ["HAS_BALANCE"] }],
    })).toMatchObject({
      status: "POSTED",
      filters: [{ field: "customerCreditStatus", operator: "in", values: ["HAS_BALANCE"] }],
    });
  });
});
