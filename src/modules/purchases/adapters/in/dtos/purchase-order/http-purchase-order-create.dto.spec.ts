import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { HttpCreatePurchaseOrderDto } from "./http-purchase-order-create.dto";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

describe("HttpCreatePurchaseOrderDto", () => {
  it("accepts purchases created without a payment form", async () => {
    const dto = plainToInstance(HttpCreatePurchaseOrderDto, {
      supplierId: "11111111-1111-4111-8111-111111111111",
      warehouseId: "22222222-2222-4222-8222-222222222222",
      documentType: VoucherDocType.FACTURA,
      serie: "F001",
      correlative: 1,
      currency: CurrencyType.PEN,
      totalTaxed: 100,
      totalExempted: 0,
      totalIgv: 18,
      purchaseValue: 82,
      total: 100,
      status: PurchaseOrderStatus.DRAFT,
      items: [],
      payments: [],
      quotas: [],
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain("paymentForm");
  });
});
