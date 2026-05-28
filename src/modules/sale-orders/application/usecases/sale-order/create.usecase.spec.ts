import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY } from "src/modules/product-catalog/domain/ports/document-serie.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PRODUCT_CATALOG_INVENTORY_REPOSITORY } from "src/modules/product-catalog/domain/ports/inventory.repository";
import { INVENTORY_LOCK } from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { CreateSaleOrderUsecase } from "./create.usecase";

describe("CreateSaleOrderUsecase", () => {
  it("rejects when stock is insufficient", async () => {
    const packRepo = { findByIdWithItems: jest.fn() };
    const serieRepo = { findActiveFor: jest.fn(), reserveNextNumber: jest.fn() };
    const stockItemRepo = { findBySkuId: jest.fn() };
    const inventoryRepo = { getSnapshot: jest.fn(), incrementReserved: jest.fn() };
    const inventoryLock = { lockSnapshots: jest.fn() };
    const saleOrderRepo = { create: jest.fn() };
    const saleOrderItemRepo = { bulkCreate: jest.fn() };
    const componentRepo = { bulkCreate: jest.fn() };
    const paymentRepo = { bulkCreate: jest.fn() };

    serieRepo.findActiveFor.mockResolvedValue([{ id: "serie-1", code: "PED" }]);
    serieRepo.reserveNextNumber.mockResolvedValue(1);

    saleOrderRepo.create.mockResolvedValue({
      id: "order-1",
      serie: "PED",
      correlative: 1,
      agendaStatus: "COORDINATED",
      deliveryStatus: null,
    });

    saleOrderItemRepo.bulkCreate.mockResolvedValue([
      { id: "item-1", quantity: 1 },
    ]);

    componentRepo.bulkCreate.mockResolvedValue([
      { skuId: "sku-1", quantity: 5 },
    ]);

    stockItemRepo.findBySkuId.mockResolvedValue({ id: "stock-1" });
    inventoryRepo.getSnapshot.mockResolvedValue({ available: 0 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: PACK_REPOSITORY, useValue: packRepo },
        { provide: PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY, useValue: serieRepo },
        { provide: PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, useValue: stockItemRepo },
        { provide: PRODUCT_CATALOG_INVENTORY_REPOSITORY, useValue: inventoryRepo },
        { provide: INVENTORY_LOCK, useValue: inventoryLock },
        { provide: SALE_ORDER_REPOSITORY, useValue: saleOrderRepo },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: saleOrderItemRepo },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: paymentRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateSaleOrderUsecase);

      await expect(
        usecase.execute(
          {
            warehouseId: "wh-1",
            clientId: "client-1",
            items: [
              {
                quantity: 1,
                unitPrice: 0,
                total: 0,
                components: [{ skuId: "sku-1", quantity: 5, unitPrice: 0, total: 0 }],
              },
            ],
          },
          "user-1",
        ),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryRepo.incrementReserved).not.toHaveBeenCalled();
      expect(paymentRepo.bulkCreate).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});

