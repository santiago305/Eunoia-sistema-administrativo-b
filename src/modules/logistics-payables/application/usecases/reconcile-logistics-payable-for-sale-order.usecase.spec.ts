import { BadRequestException } from "@nestjs/common";
import { ReconcileLogisticsPayableForSaleOrderUsecase } from "./reconcile-logistics-payable-for-sale-order.usecase";
import { CreateLogisticsPayableForSaleOrderUsecase } from "./create-logistics-payable-for-sale-order.usecase";
import { LogisticsPayablesRepository } from "../../domain/ports/logistics-payables.repository";

describe("ReconcileLogisticsPayableForSaleOrderUsecase", () => {
  const input = {
    saleOrderId: "sale-order-1",
    agencySubsidiaryId: "subsidiary-1",
    deliveryCost: 30,
  };

  const makeRepo = (overrides: Partial<jest.Mocked<LogisticsPayablesRepository>> = {}) =>
    ({
      findSubsidiaryPayableConfig: jest.fn(),
      findActiveBySaleOrderId: jest.fn().mockResolvedValue({
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
        amount: 20,
        amountPaid: 0,
      }),
      createInternalPurchase: jest.fn(),
      createAccountPayable: jest.fn(),
      createLink: jest.fn(),
      updatePendingAmounts: jest.fn().mockResolvedValue(undefined),
      cancelPending: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as jest.Mocked<LogisticsPayablesRepository>;

  it("updates pending logistics payable amounts when tariff changes without paid amount", async () => {
    const repo = makeRepo();
    const usecase = new ReconcileLogisticsPayableForSaleOrderUsecase(
      new CreateLogisticsPayableForSaleOrderUsecase(repo),
      repo,
    );

    await expect(usecase.execute(input)).resolves.toEqual({
      created: false,
      reason: "UPDATED",
    });

    expect(repo.updatePendingAmounts).toHaveBeenCalledWith(
      {
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
        saleOrderId: "sale-order-1",
        amount: 30,
      },
      undefined,
    );
  });

  it("blocks destructive reduction when logistics payable already has paid amount", async () => {
    const repo = makeRepo({
      findActiveBySaleOrderId: jest.fn().mockResolvedValue({
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
        amount: 40,
        amountPaid: 10,
      }),
    });
    const usecase = new ReconcileLogisticsPayableForSaleOrderUsecase(
      new CreateLogisticsPayableForSaleOrderUsecase(repo),
      repo,
    );

    await expect(usecase.execute(input)).rejects.toBeInstanceOf(BadRequestException);
  });
});
