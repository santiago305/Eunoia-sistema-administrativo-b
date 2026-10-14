import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { IncomeDataScopeService } from "./income-data-scope.service";

describe("IncomeDataScopeService", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  let accessControl: { getEffectivePermissions: jest.Mock };
  let dataSource: { query: jest.Mock };
  let service: IncomeDataScopeService;

  beforeEach(() => {
    accessControl = { getEffectivePermissions: jest.fn() };
    dataSource = { query: jest.fn() };
    service = new IncomeDataScopeService(accessControl as any, dataSource as any);
  });

  it("resolves view-all and wildcard permissions to unrestricted scope", async () => {
    accessControl.getEffectivePermissions.mockResolvedValue(["income.view_all"]);
    dataSource.query
      .mockResolvedValueOnce([{ company_id: "company-1" }])
      .mockResolvedValueOnce([{ company_payment_account_id: "account-1" }]);
    await expect(service.resolve(userId)).resolves.toEqual({ userId: null, companyId: "company-1", subsidiaryIds: [], accountIds: ["account-1"], clientIds: [] });
    accessControl.getEffectivePermissions.mockResolvedValue(["*"]);
    await expect(service.resolve(userId)).resolves.toEqual({ userId: null, companyId: null, subsidiaryIds: [], accountIds: [], clientIds: [] });
  });

  it("restricts view-own to the authenticated user and rejects missing scope permissions", async () => {
    accessControl.getEffectivePermissions.mockResolvedValue(["income.view_own"]);
    dataSource.query
      .mockResolvedValueOnce([{ company_id: "company-1" }])
      .mockResolvedValueOnce([
        { scope_type: "SUBSIDIARY", scope_id: "branch-1" },
        { scope_type: "PAYMENT_ACCOUNT", scope_id: "account-1" },
        { scope_type: "CLIENT", scope_id: "client-1" },
      ]);
    await expect(service.resolve(userId)).resolves.toEqual({
      userId,
      companyId: "company-1",
      subsidiaryIds: ["branch-1"],
      accountIds: ["account-1"],
      clientIds: ["client-1"],
    });
    accessControl.getEffectivePermissions.mockResolvedValue(["income.read"]);
    await expect(service.resolve(userId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires an owned or associated order before serving payment evidence", async () => {
    dataSource.query.mockResolvedValue([{ id: "income-1" }]);
    await expect(service.assertCanReadIncome("income-1", { userId })).resolves.toBeUndefined();
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining("sp.created_by_user_id = $2"), [["income-1"], userId]);

    dataSource.query.mockResolvedValue([]);
    await expect(service.assertCanReadIncome("income-other", { userId })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.assertCanReadIncome("income-any", { userId: null })).resolves.toBeUndefined();
  });

  it("allows only explicitly assigned accounts to scoped financial users", async () => {
    const accountId = "22222222-2222-4222-8222-222222222222";
    await expect(service.assertCanReadAccount(accountId, { userId, accountIds: [accountId] })).resolves.toBeUndefined();
    await expect(service.assertCanReadAccount(accountId, { userId, accountIds: [] })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.assertCanReadAccount(accountId, { userId, companyId: "company-1", accountIds: [] })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.assertCanReadAccount(accountId, { userId: null })).resolves.toBeUndefined();
  });

  it("allows client-scoped credit resources when the user can read a payment through an assigned account", async () => {
    const accountId = "22222222-2222-4222-8222-222222222222";
    const clientId = "33333333-3333-4333-8333-333333333333";
    dataSource.query.mockResolvedValueOnce([{ id: "income-1" }]);

    await expect(service.assertCanReadClient(clientId, { userId, accountIds: [accountId] })).resolves.toBeUndefined();
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("sp.company_payment_account_id = ANY($3::uuid[])"),
      [clientId, userId, [accountId]],
    );
  });

  it("lists only income sources and target orders permitted by the user's scope", async () => {
    dataSource.query
      .mockResolvedValueOnce([{ id: "income-visible" }])
      .mockResolvedValueOnce([{ id: "order-visible" }]);
    const scope = { userId, subsidiaryIds: ["branch-1"], accountIds: ["account-1"], clientIds: ["client-1"] };

    await expect(service.listReadableIncomeIdsForClient("client-1", scope)).resolves.toEqual(["income-visible"]);
    expect(dataSource.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining("so.client_id = $1 AND ((so.created_by = $2 OR sp.created_by_user_id = $2"),
      ["client-1", userId, ["branch-1"], ["client-1"], ["account-1"]],
    );
    await expect(service.listReadableSaleOrderIdsForIncome("income-1", scope)).resolves.toEqual(["order-visible"]);
    expect(dataSource.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("target.created_by = $2"),
      ["income-1", userId, ["branch-1"], ["client-1"]],
    );
  });

  it("returns unrestricted source and order scopes only for global income readers", async () => {
    await expect(service.listReadableIncomeIdsForClient("client-1", { userId: null })).resolves.toBeNull();
    await expect(service.listReadableSaleOrderIdsForIncome("income-1", { userId: null })).resolves.toBeNull();
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
