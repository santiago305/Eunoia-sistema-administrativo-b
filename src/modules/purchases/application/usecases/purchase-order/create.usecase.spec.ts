import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { CreatePurchaseOrderUsecase } from "./create.usecase";

describe("CreatePurchaseOrderUsecase", () => {
  let uow: { runInTransaction: jest.Mock };
  let purchaseRepo: { create: jest.Mock };
  let itemRepo: { add: jest.Mock };
  let paymentDocRepo: { create: jest.Mock };
  let creditQuotaRepo: { findById: jest.Mock; create: jest.Mock };
  let clock: { now: jest.Mock };
  let stockItemRepo: { findBySkuId: jest.Mock };
  let createStockItem: { execute: jest.Mock };
  let conversionService: { resolveFactor: jest.Mock };
  let notificationsService: { createNotificationForUsers: jest.Mock };

  let usecase: CreatePurchaseOrderUsecase;

  beforeEach(() => {
    uow = {
      runInTransaction: jest.fn(async (cb) => cb({})),
    };
    purchaseRepo = {
      create: jest.fn().mockResolvedValue({
        poId: "po-1",
        serie: "F001",
        correlative: 15,
        paymentForm: PaymentFormType.CONTADO,
        status: PurchaseOrderStatus.DRAFT,
        currency: CurrencyType.PEN,
        total: { getAmount: () => 100 },
      }),
    };
    itemRepo = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    paymentDocRepo = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    creditQuotaRepo = {
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
    };
    clock = {
      now: jest.fn(() => new Date("2026-05-29T12:00:00.000Z")),
    };
    stockItemRepo = {
      findBySkuId: jest.fn().mockResolvedValue({ id: "stock-1" }),
    };
    createStockItem = {
      execute: jest.fn(),
    };
    conversionService = {
      resolveFactor: jest.fn().mockResolvedValue({
        factor: 1000,
        unitBase: "KGM",
        equivalence: "KGM->GRM",
      }),
    };
    notificationsService = {
      createNotificationForUsers: jest.fn().mockResolvedValue(undefined),
    };

    usecase = new CreatePurchaseOrderUsecase(
      uow as any,
      purchaseRepo as any,
      itemRepo as any,
      paymentDocRepo as any,
      creditQuotaRepo as any,
      clock as any,
      stockItemRepo as any,
      createStockItem as any,
      conversionService as any,
      notificationsService as any,
    );
  });

  it("persiste el item con factor resuelto por conversión (1 KGM -> 1000 GRM)", async () => {
    const input = {
      supplierId: "11111111-1111-4111-8111-111111111111",
      warehouseId: "22222222-2222-4222-8222-222222222222",
      documentType: VoucherDocType.FACTURA,
      serie: "F001",
      correlative: 15,
      currency: CurrencyType.PEN,
      paymentForm: PaymentFormType.CONTADO,
      totalTaxed: 100,
      totalExempted: 0,
      totalIgv: 18,
      purchaseValue: 82,
      total: 100,
      status: PurchaseOrderStatus.DRAFT,
      items: [
        {
          skuId: "33333333-3333-4333-8333-333333333333",
          unitBase: "KGM",
          equivalence: "GRM",
          factor: 1,
          afectType: AfectIgvType.TAXED,
          quantity: 1,
          porcentageIgv: 18,
          baseWithoutIgv: 82,
          amountIgv: 18,
          unitValue: 82,
          unitPrice: 100,
          purchaseValue: 82,
        },
      ],
      payments: [],
      quotas: [],
    };

    await usecase.execute(input as any, "user-1");

    expect(conversionService.resolveFactor).toHaveBeenCalledWith(
      expect.objectContaining({
        skuId: "33333333-3333-4333-8333-333333333333",
        unitBase: "KGM",
      }),
    );

    expect(itemRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        unitBase: "KGM",
        equivalence: "KGM->GRM",
        factor: 1000,
        quantity: 1,
      }),
      expect.anything(),
    );
  });
});
