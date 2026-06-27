import { GetPurchaseOrderUsecase } from "./get-by-id.usecase";
import { PurchaseOrderFactory } from "src/modules/purchases/domain/factories/purchase-order.factory";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";

describe("GetPurchaseOrderUsecase", () => {
  const poId = "11111111-1111-4111-8111-111111111111";

  const purchaseRepo = { findById: jest.fn() };
  const itemRepo = { getByPurchaseId: jest.fn() };
  const paymentDocRepo = { findByPoId: jest.fn() };
  const creditQuotaRepo = { findByPoId: jest.fn() };
  const stockItemRepo = { findById: jest.fn() };
  const skuRepo = { findById: jest.fn() };
  const productRepo = { findById: jest.fn() };
  const listAttachments = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    purchaseRepo.findById.mockResolvedValue(
      PurchaseOrderFactory.reconstitute({
        poId,
        supplierId: "22222222-2222-4222-8222-222222222222",
        warehouseId: "33333333-3333-4333-8333-333333333333",
        totalTaxed: 0,
        totalExempted: 0,
        totalIgv: 0,
        purchaseValue: 125,
        total: 125,
        currency: CurrencyType.PEN,
        status: PurchaseOrderStatus.RECEIVED,
        imageProdution: [],
      }),
    );
    itemRepo.getByPurchaseId.mockResolvedValue([]);
    paymentDocRepo.findByPoId.mockResolvedValue([]);
    creditQuotaRepo.findByPoId.mockResolvedValue([]);
    listAttachments.execute.mockResolvedValue([
      {
        attachmentId: "attachment-1",
        purchaseId: poId,
        type: PurchaseAttachmentType.PRODUCT_PHOTO,
        url: "purchase-attachments/purchase-1/products.webp",
      },
    ]);
  });

  it("returns the product photo attachment as purchase image evidence", async () => {
    const usecase = new (GetPurchaseOrderUsecase as any)(
      purchaseRepo,
      itemRepo,
      paymentDocRepo,
      creditQuotaRepo,
      stockItemRepo,
      skuRepo,
      productRepo,
      listAttachments,
    ) as GetPurchaseOrderUsecase;

    const result = await usecase.execute({ poId });

    expect(listAttachments.execute).toHaveBeenCalledWith({
      purchaseId: poId,
      type: PurchaseAttachmentType.PRODUCT_PHOTO,
    });
    expect(result.imageProdution).toEqual(["purchase-attachments/purchase-1/products.webp"]);
  });
});
