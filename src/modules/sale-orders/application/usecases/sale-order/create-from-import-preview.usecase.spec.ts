import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderImportClientResolverService } from "src/modules/sale-orders/application/services/sale-order-import-client-resolver.service";
import { SaleOrderImportRowNormalizerService } from "src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service";
import { SaleOrderImportSkuResolverService } from "src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service";
import { SaleOrderImportSourceResolverService } from "src/modules/sale-orders/application/services/sale-order-import-source-resolver.service";
import { CreateFromImportPreviewUseCase } from "./create-from-import-preview.usecase";

describe("CreateFromImportPreviewUseCase", () => {
  it("imports a single valid row", async () => {
    const uow = { runInTransaction: (work: any) => work({}) };
    const saleOrderRepo = { create: jest.fn() };
    const saleOrderItemRepo = { bulkCreate: jest.fn() };
    const componentRepo = { bulkCreate: jest.fn() };
    const paymentRepo = { bulkCreate: jest.fn() };

    const normalizer = { normalize: jest.fn() };
    const clientResolver = { resolveOrCreate: jest.fn() };
    const sourceResolver = { resolveOrCreate: jest.fn() };
    const skuResolver = { resolveOrCreateSkus: jest.fn() };

    normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-05-20",
        deliveryType: "ABONADO_ENVIO",
        address: "Av",
        internalNote: "facebook",
        total: 120,
        advance: 40,
        parsedSkus: [{ rawCode: "X", productName: "A", variantName: null, skuName: "A", customSku: "EVA001", quantity: 2 }],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    clientResolver.resolveOrCreate.mockResolvedValue("client-1");
    sourceResolver.resolveOrCreate.mockResolvedValue("source-1");
    skuResolver.resolveOrCreateSkus.mockResolvedValue([{ productId: "p1", skuId: "s1", skuName: "A", customSku: "EVA001", quantity: 2 }]);

    saleOrderRepo.create.mockResolvedValue({ id: "order-1" });
    saleOrderItemRepo.bulkCreate.mockResolvedValue([{ id: "item-1" }]);
    componentRepo.bulkCreate.mockResolvedValue([{ id: "c-1" }]);
    paymentRepo.bulkCreate.mockResolvedValue([{ id: "pay-1" }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFromImportPreviewUseCase,
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: SALE_ORDER_REPOSITORY, useValue: saleOrderRepo },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: saleOrderItemRepo },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: paymentRepo },
        { provide: SaleOrderImportRowNormalizerService, useValue: normalizer },
        { provide: SaleOrderImportClientResolverService, useValue: clientResolver },
        { provide: SaleOrderImportSourceResolverService, useValue: sourceResolver },
        { provide: SaleOrderImportSkuResolverService, useValue: skuResolver },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateFromImportPreviewUseCase);
      jest.spyOn(usecase as any, "reserveNextSaleOrderCorrelative").mockResolvedValue(1);

      const result = await usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });
      expect(result.importedRows).toBe(1);
      expect(result.failedRows).toBe(0);
      expect(result.rows[0].saleOrderId).toBe("order-1");
    } finally {
      await moduleRef.close();
    }
  });

  it("reports normalization errors", async () => {
    const normalizer = { normalize: jest.fn() };
    normalizer.normalize.mockResolvedValue({ ok: false, rowNumber: 2, errors: ["Numero de telefono es obligatorio"] });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFromImportPreviewUseCase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: SALE_ORDER_REPOSITORY, useValue: { create: jest.fn() } },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: SaleOrderImportRowNormalizerService, useValue: normalizer },
        { provide: SaleOrderImportClientResolverService, useValue: { resolveOrCreate: jest.fn() } },
        { provide: SaleOrderImportSourceResolverService, useValue: { resolveOrCreate: jest.fn() } },
        { provide: SaleOrderImportSkuResolverService, useValue: { resolveOrCreateSkus: jest.fn() } },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateFromImportPreviewUseCase);
      const result = await usecase.execute({ rows: [{} as any], userId: "user-1" });
      expect(result.importedRows).toBe(0);
      expect(result.failedRows).toBe(1);
      expect(result.errors[0].rowNumber).toBe(2);
    } finally {
      await moduleRef.close();
    }
  });
});

