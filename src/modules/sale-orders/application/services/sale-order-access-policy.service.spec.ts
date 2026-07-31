import { SaleOrderAccessPolicyService } from "./sale-order-access-policy.service";

describe("SaleOrderAccessPolicyService", () => {
  const make = (permissions: string[]) =>
    new SaleOrderAccessPolicyService({
      getEffectivePermissions: jest.fn().mockResolvedValue(permissions),
    } as never);

  it("gives wildcard users full read context", async () => {
    await expect(make(["*"]).resolveReadContext("user-1")).resolves.toEqual({
      userId: "user-1",
      viewAll: true,
      includeDeleted: true,
      includeCustomerData: true,
      includeAmounts: true,
      includeProducts: true,
    });
  });

  it("uses view_all to expand scope and view_deleted to include archived orders", async () => {
    await expect(
      make(["sale_orders.view", "sale_orders.view_all", "sale_orders.view_deleted"]).resolveReadContext("user-2"),
    ).resolves.toMatchObject({ userId: "user-2", viewAll: true, includeDeleted: true });
  });

  it("keeps ordinary users in their created or assigned scope", async () => {
    await expect(make(["sale_orders.view"]).resolveReadContext("user-3")).resolves.toMatchObject({
      userId: "user-3",
      viewAll: false,
      includeDeleted: false,
    });
  });

  it("redacts sensitive sections unless their explicit permissions exist", async () => {
    await expect(make(["sale_orders.view", "sale_orders.products.view"]).resolveReadContext("user-4")).resolves.toEqual({
      userId: "user-4",
      viewAll: false,
      includeDeleted: false,
      includeCustomerData: false,
      includeAmounts: false,
      includeProducts: true,
    });
  });
});
