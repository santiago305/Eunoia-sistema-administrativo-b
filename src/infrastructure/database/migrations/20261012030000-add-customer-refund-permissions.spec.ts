import { databaseMigrations } from "../typeorm.config";
import { AddCustomerRefundPermissions20261012030000 } from "./20261012030000-add-customer-refund-permissions";

describe("AddCustomerRefundPermissions20261012030000", () => {
  it("registers the explicit own-approval exception and pending-cancel permission", async () => {
    expect(databaseMigrations).toContain(AddCustomerRefundPermissions20261012030000);
    const runner = { query: jest.fn() };

    await new AddCustomerRefundPermissions20261012030000().up(runner as never);

    expect(runner.query).toHaveBeenCalledTimes(2);
    expect(runner.query).toHaveBeenNthCalledWith(1, expect.stringContaining("ON CONFLICT (code) DO UPDATE"), [
      "customer_refunds.post_own", "Confirmar reembolsos propios", expect.any(String), "post_own",
    ]);
    expect(runner.query).toHaveBeenNthCalledWith(2, expect.stringContaining("ON CONFLICT (code) DO UPDATE"), [
      "customer_refunds.cancel", "Cancelar reembolsos pendientes", expect.any(String), "cancel",
    ]);
  });

  it("rolls back only permissions introduced by the migration", async () => {
    const runner = { query: jest.fn() };
    await new AddCustomerRefundPermissions20261012030000().down(runner as never);
    expect(runner.query).toHaveBeenCalledWith("DELETE FROM permissions WHERE code = ANY($1::text[])", [["customer_refunds.post_own", "customer_refunds.cancel"]]);
  });
});
