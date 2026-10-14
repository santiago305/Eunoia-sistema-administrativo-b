import { databaseMigrations } from "../typeorm.config";
import { HardenSalePaymentCorrection20261012010000 } from "./20261012010000-harden-sale-payment-correction";

describe("HardenSalePaymentCorrection20261012010000", () => {
  it("is registered and enforces a single correction successor", async () => {
    expect(databaseMigrations).toContain(HardenSalePaymentCorrection20261012010000);
    const queries: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => { queries.push(sql); }) };

    await new HardenSalePaymentCorrection20261012010000().up(runner as never);
    const sql = queries.join("\n");

    expect(sql).toContain("uq_sale_payments_corrected_from");
    expect(sql).toContain("WHERE corrected_from_payment_id IS NOT NULL");
    expect(sql).toContain("DECLARE existing_type varchar(24)");
    expect(sql).toContain("existing_type = 'INCOME'");
    expect(sql).toContain("old_payment.status = 'REVERSED'");
    expect(sql).toContain("RAISE EXCEPTION 'El número de operación ya está registrado'");
  });
});
