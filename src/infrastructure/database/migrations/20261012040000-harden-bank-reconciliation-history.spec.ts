import { databaseMigrations } from "../typeorm.config";
import { HardenBankReconciliationHistory20261012040000 } from "./20261012040000-harden-bank-reconciliation-history";

describe("HardenBankReconciliationHistory20261012040000", () => {
  it("registers database guards for bank statement lines and allocation history", async () => {
    expect(databaseMigrations).toContain(HardenBankReconciliationHistory20261012040000);
    const runner = { query: jest.fn() };
    await new HardenBankReconciliationHistory20261012040000().up(runner as never);
    expect(runner.query).toHaveBeenCalledWith(expect.stringContaining("Bank statement lines are immutable"));
    expect(runner.query).toHaveBeenCalledWith(expect.stringContaining("A reconciliation allocation may only be unreconciled once with a reason"));
  });

  it("removes only the guards it owns", async () => {
    const runner = { query: jest.fn() };
    await new HardenBankReconciliationHistory20261012040000().down(runner as never);
    expect(runner.query).toHaveBeenCalledWith(expect.stringContaining("DROP TRIGGER IF EXISTS trg_bank_reconciliation_allocations_guard"));
  });
});
