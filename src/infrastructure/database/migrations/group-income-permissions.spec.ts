import { GroupIncomePermissions20261016020000 } from "./20261016020000-group-income-permissions";

describe("GroupIncomePermissions20261016020000", () => {
  it("groups lifecycle permissions under income without changing their codes", async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
    await new GroupIncomePermissions20261016020000().up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("module = 'income'"));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("sale_orders.payments.update_pending"));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("sale_orders.payments.post_bulk"));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("page.income.view"));
  });

  it("restores the previous module for lifecycle permissions", async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
    await new GroupIncomePermissions20261016020000().down(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("module = 'sale_orders'"));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("Ver ingresos"));
  });
});
