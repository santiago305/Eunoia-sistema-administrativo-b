import { databaseMigrations } from "../typeorm.config";
import { AllowSaleOrderTrackingAuditActions20260731132000 } from "./20260731132000-allow-sale-order-tracking-audit-actions";

describe("AllowSaleOrderTrackingAuditActions20260731132000", () => {
  it("is registered and permits every tracking audit action", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };

    expect(databaseMigrations).toContain(AllowSaleOrderTrackingAuditActions20260731132000);

    await new AllowSaleOrderTrackingAuditActions20260731132000().up(queryRunner as never);
    const sql = queries.join("\n");

    expect(sql).toContain("DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action");
    expect(sql).toContain("'delete'");
    expect(sql).toContain("'restore'");
    expect(sql).toContain("'preguide_on'");
    expect(sql).toContain("'preguide_off'");
    expect(sql).toContain("'prepared_on'");
    expect(sql).toContain("'prepared_off'");
  });

  it("restores the original delete/restore constraint on rollback", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };

    await new AllowSaleOrderTrackingAuditActions20260731132000().down(queryRunner as never);
    const sql = queries.join("\n");
    const restoredConstraintSql = queries.at(-1) ?? "";

    expect(sql).toContain("DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action");
    expect(restoredConstraintSql).toContain("CHECK (action_execution IN ('delete', 'restore'))");
    expect(restoredConstraintSql).not.toContain("preguide_on");
    expect(restoredConstraintSql).not.toContain("prepared_on");
  });
});
