import { PostInventoryFromPurchaseUsecase } from "./Inventory-purchase.usecase";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";

describe("PostInventoryFromPurchaseUsecase", () => {
  let uow: { runInTransaction: jest.Mock };
  let purchaseRepo: { findById: jest.Mock };
  let purchaseItemRepo: { getByPurchaseId: jest.Mock };
  let stockItemRepo: { findById: jest.Mock };
  let documentRepo: {
    createDraft: jest.Mock;
    addItem: jest.Mock;
    markPosted: jest.Mock;
    findById: jest.Mock;
    listItems: jest.Mock;
  };
  let seriesRepo: { findActiveFor: jest.Mock; reserveNextNumber: jest.Mock };
  let registerMovement: { execute: jest.Mock };

  let usecase: PostInventoryFromPurchaseUsecase;

  beforeEach(() => {
    uow = {
      runInTransaction: jest.fn(async (cb) => cb({})),
    };
    purchaseRepo = {
      findById: jest.fn().mockResolvedValue({
        poId: "po-1",
        warehouseId: "wh-1",
        currency: CurrencyType.PEN,
      }),
    };
    purchaseItemRepo = {
      getByPurchaseId: jest.fn().mockResolvedValue([
        {
          stockItemId: "stock-item-1",
          quantity: 1,
          factor: 1000,
          unitPrice: { getAmount: () => 12.5 },
        },
      ]),
    };
    stockItemRepo = {
      findById: jest.fn().mockResolvedValue({
        id: "stock-item-1",
        skuId: "sku-1",
      }),
    };
    documentRepo = {
      createDraft: jest.fn().mockResolvedValue({ id: "doc-1" }),
      addItem: jest.fn().mockResolvedValue(undefined),
      markPosted: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({
        id: "doc-1",
        docType: "IN",
        status: "POSTED",
        serieId: "serie-1",
        correlative: 25,
        fromWarehouseId: undefined,
        toWarehouseId: "wh-1",
        referenceId: "po-1",
        referenceType: "PURCHASE",
        note: "Ingreso por compra",
        createdBy: "user-1",
        postedBy: "user-1",
        postedAt: new Date("2026-05-29T12:00:00.000Z"),
        createdAt: new Date("2026-05-29T11:00:00.000Z"),
      }),
      listItems: jest.fn().mockResolvedValue([]),
    };
    seriesRepo = {
      findActiveFor: jest.fn().mockResolvedValue([{ id: "serie-1" }]),
      reserveNextNumber: jest.fn().mockResolvedValue(25),
    };
    registerMovement = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    usecase = new PostInventoryFromPurchaseUsecase(
      uow as any,
      purchaseRepo as any,
      purchaseItemRepo as any,
      stockItemRepo as any,
      documentRepo as any,
      seriesRepo as any,
      registerMovement as any,
    );
  });

  it("registra inventario usando quantity * factor (1 * 1000 = 1000)", async () => {
    await usecase.execute({
      poId: "po-1",
      toWarehouseId: "wh-1",
      postedBy: "user-1",
      createdBy: "user-1",
      note: "Ingreso por compra",
    });

    expect(documentRepo.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 1000,
      }),
      expect.anything(),
    );

    expect(registerMovement.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            quantity: 1000,
          }),
        ],
      }),
      expect.anything(),
    );
  });
});
