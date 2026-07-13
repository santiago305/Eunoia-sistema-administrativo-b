import { CompanyPaymentAccountsController } from "./company-payment-accounts.controller";

describe("CompanyPaymentAccountsController", () => {
  it("lists accounts without sensitive data when the user lacks view_sensitive", async () => {
    const listAccounts = {
      execute: jest.fn().mockResolvedValue({ items: [] }),
    };
    const accessControl = {
      getEffectivePermissions: jest.fn().mockResolvedValue(["payment_accounts.view"]),
    };
    const controller = new CompanyPaymentAccountsController(
      {} as any,
      listAccounts as any,
      {} as any,
      {} as any,
      accessControl as any,
    );

    await controller.listByCompany("company-1", { id: "user-1" });

    expect(accessControl.getEffectivePermissions).toHaveBeenCalledWith("user-1");
    expect(listAccounts.execute).toHaveBeenCalledWith({
      companyId: "company-1",
      includeSensitive: false,
    });
  });

  it("lists accounts with sensitive data when the user has view_sensitive", async () => {
    const listAccounts = {
      execute: jest.fn().mockResolvedValue({ items: [] }),
    };
    const accessControl = {
      getEffectivePermissions: jest.fn().mockResolvedValue([
        "payment_accounts.view",
        "payment_accounts.view_sensitive",
      ]),
    };
    const controller = new CompanyPaymentAccountsController(
      {} as any,
      listAccounts as any,
      {} as any,
      {} as any,
      accessControl as any,
    );

    await controller.listByCompany("company-1", { id: "user-1" });

    expect(listAccounts.execute).toHaveBeenCalledWith({
      companyId: "company-1",
      includeSensitive: true,
    });
  });
});
