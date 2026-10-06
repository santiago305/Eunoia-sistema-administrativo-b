import { auditIncomePaymentEvidence } from "../../scripts/audit-income-payment-evidence";

describe("audit-income-payment-evidence", () => {
  it("runs all operational integrity checks without mutating data", async () => {
    const dataSource = { query: jest.fn(async () => []) } as any;
    const result = await auditIncomePaymentEvidence(dataSource);
    expect(dataSource.query).toHaveBeenCalledTimes(4);
    expect(result).toHaveLength(4);
    expect(result.every((item) => item.count === 0)).toBe(true);
  });
});
