import { BadRequestException } from "@nestjs/common";
import { IncomeResourceScopeGuard } from "./income-resource-scope.guard";

describe("IncomeResourceScopeGuard", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const scope = { userId };
  let incomeScope: {
    resolve: jest.Mock;
    assertCanReadIncome: jest.Mock;
    assertCanReadIncomes: jest.Mock;
    assertCanReadRefund: jest.Mock;
    assertCanReadClient: jest.Mock;
    assertCanReadSaleOrder: jest.Mock;
    assertCanReadAccount: jest.Mock;
    assertCanReadStatementLine: jest.Mock;
  };
  let guard: IncomeResourceScopeGuard;

  const context = (params: any = {}, body: any = {}, user: any = { id: userId }) => ({
    switchToHttp: () => ({ getRequest: () => ({ params, body, user }) }),
  } as any);

  beforeEach(() => {
    incomeScope = {
      resolve: jest.fn().mockResolvedValue(scope),
      assertCanReadIncome: jest.fn().mockResolvedValue(undefined),
      assertCanReadIncomes: jest.fn().mockResolvedValue(undefined),
      assertCanReadRefund: jest.fn().mockResolvedValue(undefined),
      assertCanReadClient: jest.fn().mockResolvedValue(undefined),
      assertCanReadSaleOrder: jest.fn().mockResolvedValue(undefined),
      assertCanReadAccount: jest.fn().mockResolvedValue(undefined),
      assertCanReadStatementLine: jest.fn().mockResolvedValue(undefined),
    };
    guard = new IncomeResourceScopeGuard(incomeScope as any);
  });

  it("checks a single income, refund, and client against the authenticated user's scope", async () => {
    const refundId = "22222222-2222-4222-8222-222222222222";
    const clientId = "33333333-3333-4333-8333-333333333333";
    await expect(guard.canActivate(context({ incomeId: userId, refundId, clientId }))).resolves.toBe(true);
    expect(incomeScope.resolve).toHaveBeenCalledWith(userId);
    expect(incomeScope.assertCanReadIncome).toHaveBeenCalledWith(userId, scope);
    expect(incomeScope.assertCanReadRefund).toHaveBeenCalledWith(refundId, scope);
    expect(incomeScope.assertCanReadClient).toHaveBeenCalledWith(clientId, scope);
  });

  it("checks every batch income plus source and target orders", async () => {
    const orderId = "44444444-4444-4444-8444-444444444444";
    const incomeId = "55555555-5555-4555-8555-555555555555";
    const targetOrderId = "66666666-6666-4666-8666-666666666666";
    const clientId = "77777777-7777-4777-8777-777777777777";
    await expect(guard.canActivate(context({}, { payments: [{ id: incomeId }, { id: userId }], clientId, saleOrderId: orderId, targetSaleOrderId: targetOrderId }))).resolves.toBe(true);
    expect(incomeScope.assertCanReadIncomes).toHaveBeenCalledWith([incomeId, userId], scope);
    expect(incomeScope.assertCanReadSaleOrder).toHaveBeenCalledWith(orderId, scope);
    expect(incomeScope.assertCanReadSaleOrder).toHaveBeenCalledWith(targetOrderId, scope);
    expect(incomeScope.assertCanReadClient).toHaveBeenCalledWith(clientId, scope);
  });

  it("rejects malformed resource identifiers before querying PostgreSQL", async () => {
    await expect(guard.canActivate(context({ incomeId: "not-a-uuid" }))).rejects.toBeInstanceOf(BadRequestException);
    expect(incomeScope.resolve).not.toHaveBeenCalled();
  });

  it("checks bank accounts and statement lines against assigned account scope", async () => {
    const accountId = "33333333-3333-4333-8333-333333333333";
    const lineId = "44444444-4444-4444-8444-444444444444";
    await expect(guard.canActivate(context({}, { companyPaymentAccountId: accountId, bankStatementLineId: lineId }))).resolves.toBe(true);
    expect(incomeScope.assertCanReadAccount).toHaveBeenCalledWith(accountId, scope);
    expect(incomeScope.assertCanReadStatementLine).toHaveBeenCalledWith(lineId, scope);
  });

  it("does not apply a record scope to endpoints without resource identifiers", async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(incomeScope.resolve).not.toHaveBeenCalled();
  });
});
