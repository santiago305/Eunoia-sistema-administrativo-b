import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PRODUCT_CATALOG_INVENTORY_REPOSITORY } from "src/modules/product-catalog/domain/ports/inventory.repository";
import { INVENTORY_LOCK } from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";
import { UpdateSaleOrderUsecase } from "./update.usecase";

describe("UpdateSaleOrderUsecase", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-30T15:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("derives agendaStatus/deliveryStatus based on deliveryDate and deliveryType", async () => {
    const packRepo = { findByIdWithItems: jest.fn() };
    const stockItemRepo = { findBySkuId: jest.fn() };
    const inventoryRepo = { getSnapshot: jest.fn(), incrementReserved: jest.fn() };
    const inventoryLock = { lockSnapshots: jest.fn() };
    const saleOrderRepo = { findByIdForUpdate: jest.fn(), update: jest.fn(), updateStatuses: jest.fn() };
    const saleOrderItemRepo = { listBySaleOrderId: jest.fn(), deleteBySaleOrderId: jest.fn(), bulkCreate: jest.fn() };
    const componentRepo = { listBySaleOrderItemIds: jest.fn(), deleteBySaleOrderItemIds: jest.fn(), bulkCreate: jest.fn() };
    const paymentRepo = { deleteBySaleOrderId: jest.fn(), bulkCreate: jest.fn() };

    const saleOrderId = "00000000-0000-4000-8000-000000000010";
    const warehouseId = "00000000-0000-4000-8000-000000000001";

    saleOrderRepo.findByIdForUpdate.mockResolvedValue({
      id: saleOrderId,
      warehouseId: null,
      agendaStatus: AgendaStatus.COORDINATED,
      deliveryStatus: null,
    });

    saleOrderItemRepo.listBySaleOrderId.mockResolvedValue([{ id: "old-item-1" }]);
    componentRepo.listBySaleOrderItemIds.mockResolvedValue([]);

    stockItemRepo.findBySkuId.mockResolvedValue({ id: "stock-1" });
    inventoryRepo.getSnapshot.mockResolvedValue({ available: 999 });

    saleOrderRepo.update.mockResolvedValue({
      id: saleOrderId,
      serie: "PE",
      correlative: 1,
      agendaStatus: AgendaStatus.COORDINATED,
      deliveryStatus: null,
    });

    saleOrderRepo.updateStatuses.mockResolvedValue({
      id: saleOrderId,
      serie: "PE",
      correlative: 1,
      agendaStatus: AgendaStatus.PROGRAMMED,
      deliveryStatus: DeliveryStatus.WAITING,
    });

    saleOrderItemRepo.bulkCreate.mockResolvedValue([{ id: "new-item-1" }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: PACK_REPOSITORY, useValue: packRepo },
        { provide: PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, useValue: stockItemRepo },
        { provide: PRODUCT_CATALOG_INVENTORY_REPOSITORY, useValue: inventoryRepo },
        { provide: INVENTORY_LOCK, useValue: inventoryLock },
        { provide: SALE_ORDER_REPOSITORY, useValue: saleOrderRepo },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: saleOrderItemRepo },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: paymentRepo },
      ],
    }).compile();

    const usecase = moduleRef.get(UpdateSaleOrderUsecase);

    const result = await usecase.execute({
      saleOrderId,
      warehouseId,
      clientId: "00000000-0000-4000-8000-000000000002",
      deliveryDate: "2026-05-30",
      deliveryType: DeliveryType.ABONADO_ENVIO,
      subTotal: 10,
      deliveryCost: 0,
      total: 10,
      items: [
        {
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{ skuId: "sku-1", quantity: 1, unitPrice: 10, total: 10 }],
        },
      ],
    });

    expect(saleOrderRepo.updateStatuses).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId,
        agendaStatus: AgendaStatus.PROGRAMMED,
        deliveryStatus: DeliveryStatus.WAITING,
      }),
      expect.anything(),
    );

    expect(result).toEqual({
      orderId: saleOrderId,
      serie: "PE",
      correlative: 1,
      agendaStatus: AgendaStatus.PROGRAMMED,
      deliveryStatus: DeliveryStatus.WAITING,
    });
  });

  it("does not build old inventory keys when the existing imported order has no warehouse", async () => {
    const packRepo = { findByIdWithItems: jest.fn() };
    const stockItemRepo = { findBySkuId: jest.fn() };
    const inventoryRepo = { getSnapshot: jest.fn(), incrementReserved: jest.fn() };
    const inventoryLock = { lockSnapshots: jest.fn() };
    const saleOrderRepo = { findByIdForUpdate: jest.fn(), update: jest.fn(), updateStatuses: jest.fn() };
    const saleOrderItemRepo = { listBySaleOrderId: jest.fn(), deleteBySaleOrderId: jest.fn(), bulkCreate: jest.fn() };
    const componentRepo = { listBySaleOrderItemIds: jest.fn(), deleteBySaleOrderItemIds: jest.fn(), bulkCreate: jest.fn() };
    const paymentRepo = { deleteBySaleOrderId: jest.fn(), bulkCreate: jest.fn() };

    const saleOrderId = "00000000-0000-4000-8000-000000000010";
    const warehouseId = "00000000-0000-4000-8000-000000000001";

    saleOrderRepo.findByIdForUpdate.mockResolvedValue({
      id: saleOrderId,
      warehouseId: null,
      agendaStatus: AgendaStatus.COORDINATED,
      deliveryStatus: null,
    });
    saleOrderItemRepo.listBySaleOrderId.mockResolvedValue([{ id: "old-item-1" }]);
    componentRepo.listBySaleOrderItemIds.mockResolvedValue([
      { skuId: "sku-1", quantity: 1, unitPrice: 10, total: 10 },
    ]);
    stockItemRepo.findBySkuId.mockResolvedValue({ id: "stock-1" });
    inventoryRepo.getSnapshot.mockResolvedValue({ available: 999 });
    saleOrderRepo.update.mockResolvedValue({
      id: saleOrderId,
      serie: "PE",
      correlative: 1,
      agendaStatus: AgendaStatus.COORDINATED,
      deliveryStatus: null,
    });
    saleOrderRepo.updateStatuses.mockResolvedValue({
      id: saleOrderId,
      serie: "PE",
      correlative: 1,
      agendaStatus: AgendaStatus.COORDINATED,
      deliveryStatus: null,
    });
    saleOrderItemRepo.bulkCreate.mockResolvedValue([{ id: "new-item-1" }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: PACK_REPOSITORY, useValue: packRepo },
        { provide: PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, useValue: stockItemRepo },
        { provide: PRODUCT_CATALOG_INVENTORY_REPOSITORY, useValue: inventoryRepo },
        { provide: INVENTORY_LOCK, useValue: inventoryLock },
        { provide: SALE_ORDER_REPOSITORY, useValue: saleOrderRepo },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: saleOrderItemRepo },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: paymentRepo },
      ],
    }).compile();

    const usecase = moduleRef.get(UpdateSaleOrderUsecase);

    await usecase.execute({
      saleOrderId,
      warehouseId,
      clientId: "00000000-0000-4000-8000-000000000002",
      deliveryDate: "2026-05-30",
      deliveryType: DeliveryType.ABONADO_ENVIO,
      subTotal: 10,
      deliveryCost: 0,
      total: 10,
      items: [
        {
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{ skuId: "sku-1", quantity: 1, unitPrice: 10, total: 10 }],
        },
      ],
    });

    expect(inventoryRepo.getSnapshot).toHaveBeenCalledTimes(1);
    expect(inventoryRepo.getSnapshot).toHaveBeenCalledWith(
      { warehouseId, stockItemId: "stock-1", locationId: null },
      expect.anything(),
    );
    expect(inventoryLock.lockSnapshots).toHaveBeenCalledWith(
      [{ warehouseId, stockItemId: "stock-1" }],
      expect.anything(),
    );
    expect(inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      { warehouseId, stockItemId: "stock-1", locationId: null, delta: 1 },
      expect.anything(),
    );
  });
});

