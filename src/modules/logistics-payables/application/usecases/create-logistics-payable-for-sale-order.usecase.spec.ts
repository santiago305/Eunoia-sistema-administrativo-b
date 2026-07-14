import { BadRequestException } from "@nestjs/common";
import { CreateLogisticsPayableForSaleOrderUsecase } from "./create-logistics-payable-for-sale-order.usecase";
import { LogisticsPayablesRepository } from "../../domain/ports/logistics-payables.repository";

describe("CreateLogisticsPayableForSaleOrderUsecase", () => {
  const input = {
    saleOrderId: "sale-order-1",
    serie: "P001",
    correlative: 10,
    agencySubsidiaryId: "subsidiary-1",
    deliveryCost: 18,
    deliveryDate: "2026-07-15",
    scheduleDate: "2026-07-16",
    createdByUserId: "user-1",
  };

  const makeRepo = (overrides: Partial<jest.Mocked<LogisticsPayablesRepository>> = {}) =>
    ({
      findSubsidiaryPayableConfig: jest.fn().mockResolvedValue({
        generatesPayable: true,
        payableSupplierId: "supplier-1",
        payableDescription: "Courier",
      }),
      findActiveBySaleOrderId: jest.fn().mockResolvedValue(null),
      createInternalPurchase: jest.fn().mockResolvedValue({ purchaseId: "purchase-1" }),
      createAccountPayable: jest.fn().mockResolvedValue({ accountPayableId: "payable-1" }),
      createLink: jest.fn().mockResolvedValue({ id: "link-1" }),
      ...overrides,
    }) as jest.Mocked<LogisticsPayablesRepository>;

  it("skips orders without payable agency configuration", async () => {
    const repo = makeRepo({
      findSubsidiaryPayableConfig: jest.fn().mockResolvedValue({
        generatesPayable: false,
        payableSupplierId: null,
        payableDescription: null,
      }),
    });
    const usecase = new CreateLogisticsPayableForSaleOrderUsecase(repo);

    await expect(usecase.execute(input)).resolves.toEqual({ created: false, reason: "AGENCY_NOT_PAYABLE" });

    expect(repo.createInternalPurchase).not.toHaveBeenCalled();
    expect(repo.createAccountPayable).not.toHaveBeenCalled();
  });

  it("creates internal service purchase, account payable and sale order link", async () => {
    const repo = makeRepo();
    const usecase = new CreateLogisticsPayableForSaleOrderUsecase(repo);

    await expect(usecase.execute(input)).resolves.toEqual({
      created: true,
      purchaseId: "purchase-1",
      accountPayableId: "payable-1",
    });

    expect(repo.createInternalPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: "supplier-1",
        total: 18,
        note: "Egreso logistico pedido P001-10",
      }),
      undefined,
    );
    expect(repo.createAccountPayable).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: "purchase-1",
        supplierId: "supplier-1",
        amountTotal: 18,
        dueDate: new Date("2026-07-15"),
      }),
      undefined,
    );
    expect(repo.createLink).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: "sale-order-1",
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
        amount: 18,
        status: "ACTIVE",
      }),
      undefined,
    );
  });

  it("rejects payable agencies without supplier", async () => {
    const repo = makeRepo({
      findSubsidiaryPayableConfig: jest.fn().mockResolvedValue({
        generatesPayable: true,
        payableSupplierId: null,
        payableDescription: null,
      }),
    });
    const usecase = new CreateLogisticsPayableForSaleOrderUsecase(repo);

    await expect(usecase.execute(input)).rejects.toBeInstanceOf(BadRequestException);
  });
});
