import { databaseMigrations } from "../typeorm.config";
import { ValidateSalePaymentLifecycle20261014010000 } from "./20261014010000-validate-sale-payment-lifecycle";

describe("ValidateSalePaymentLifecycle20261014010000", () => {
  it("is registered and validates the existing four-state constraint", async () => {
    expect(databaseMigrations).toContain(ValidateSalePaymentLifecycle20261014010000);
    const query = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        definition: "CHECK (status IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED'))",
        validated: false,
      }])
      .mockResolvedValueOnce([]);

    await new ValidateSalePaymentLifecycle20261014010000().up({ query } as never);

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2][0]).toContain("VALIDATE CONSTRAINT chk_sale_payments_lifecycle_status");
  });

  it("aborts before constraint inspection when non-canonical rows remain", async () => {
    const query = jest.fn().mockResolvedValueOnce([{ status: "APPROVED", total: 2 }]);

    await expect(new ValidateSalePaymentLifecycle20261014010000().up({ query } as never))
      .rejects.toThrow("APPROVED=2");

    expect(query).toHaveBeenCalledTimes(1);
  });

  it("does not issue DDL when the canonical constraint is already validated", async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        definition: "CHECK (status IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED'))",
        validated: true,
      }]);

    await new ValidateSalePaymentLifecycle20261014010000().up({ query } as never);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("ALTER TABLE"))).toBe(false);
  });

  it("refuses to proceed if the canonical constraint is missing or incomplete", async () => {
    const missing = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(new ValidateSalePaymentLifecycle20261014010000().up({ query: missing } as never))
      .rejects.toThrow("is missing");

    const incomplete = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{
      definition: "CHECK (status IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED'))",
      validated: false,
    }]);
    await expect(new ValidateSalePaymentLifecycle20261014010000().up({ query: incomplete } as never))
      .rejects.toThrow("REVERSED");
    expect(incomplete).toHaveBeenCalledTimes(2);
  });
});
