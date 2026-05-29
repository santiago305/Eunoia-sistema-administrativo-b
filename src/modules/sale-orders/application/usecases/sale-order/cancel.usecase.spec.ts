import { CancelSaleOrderUsecase } from "./cancel.usecase";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";

describe("CancelSaleOrderUsecase", () => {
  it("throws when order not found", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue(null) };
    const saleOrderItemRepo = { listBySaleOrderId: jest.fn() };
    const componentRepo = { listBySaleOrderItemIds: jest.fn() };
    const stockItemRepo = { findBySkuId: jest.fn() };
    const inventoryRepo = { incrementReserved: jest.fn() };
    const inventoryLock = { lockSnapshots: jest.fn() };
    const clientRepo = { update: jest.fn() };

    const uc = new CancelSaleOrderUsecase(
      uow as any,
      saleOrderRepo as any,
      saleOrderItemRepo as any,
      componentRepo as any,
      stockItemRepo as any,
      inventoryRepo as any,
      inventoryLock as any,
      clientRepo as any,
    );

    await expect(uc.execute({ saleOrderId: "id-1" })).rejects.toThrow("Pedido no encontrado");
  });

  it("throws when already canceled", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "id-1",
        warehouseId: "wh-1",
        clientId: "client-1",
        agendaStatus: AgendaStatus.CANCELED,
        deliveryStatus: null,
      }),
    };

    const uc = new CancelSaleOrderUsecase(
      uow as any,
      saleOrderRepo as any,
      { listBySaleOrderId: jest.fn() } as any,
      { listBySaleOrderItemIds: jest.fn() } as any,
      { findBySkuId: jest.fn() } as any,
      { incrementReserved: jest.fn() } as any,
      { lockSnapshots: jest.fn() } as any,
      { update: jest.fn() } as any,
    );

    await expect(uc.execute({ saleOrderId: "id-1" })).rejects.toThrow("ya cancelado");
  });

  it("throws when delivered", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "id-1",
        warehouseId: "wh-1",
        clientId: "client-1",
        agendaStatus: AgendaStatus.PROGRAMMED,
        deliveryStatus: DeliveryStatus.DELIVERED,
      }),
    };

    const uc = new CancelSaleOrderUsecase(
      uow as any,
      saleOrderRepo as any,
      { listBySaleOrderId: jest.fn() } as any,
      { listBySaleOrderItemIds: jest.fn() } as any,
      { findBySkuId: jest.fn() } as any,
      { incrementReserved: jest.fn() } as any,
      { lockSnapshots: jest.fn() } as any,
      { update: jest.fn() } as any,
    );

    await expect(uc.execute({ saleOrderId: "id-1" })).rejects.toThrow("no se puede cancelar entregado");
  });

  it("releases reserved stock and updates statuses", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "id-1",
        warehouseId: "wh-1",
        clientId: "client-1",
        agendaStatus: AgendaStatus.PROGRAMMED,
        deliveryStatus: DeliveryStatus.IN_PROGRESS,
      }),
      updateStatuses: jest.fn().mockResolvedValue({ id: "id-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const saleOrderItemRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([{ id: "item-1" }, { id: "item-2" }]),
    };
    const componentRepo = {
      listBySaleOrderItemIds: jest.fn().mockResolvedValue([
        { saleOrderItemId: "item-1", skuId: "sku-1", quantity: 2 },
        { saleOrderItemId: "item-2", skuId: "sku-1", quantity: 1 },
        { saleOrderItemId: "item-2", skuId: "sku-2", quantity: 4 },
      ]),
    };
    const stockItemRepo = {
      findBySkuId: jest.fn()
        .mockResolvedValueOnce({ id: "stock-1" })
        .mockResolvedValueOnce({ id: "stock-2" }),
    };
    const inventoryLock = { lockSnapshots: jest.fn().mockResolvedValue(undefined) };
    const inventoryRepo = { incrementReserved: jest.fn().mockResolvedValue(undefined) };
    const clientRepo = { update: jest.fn().mockResolvedValue({ id: "client-1" }) };

    const uc = new CancelSaleOrderUsecase(
      uow as any,
      saleOrderRepo as any,
      saleOrderItemRepo as any,
      componentRepo as any,
      stockItemRepo as any,
      inventoryRepo as any,
      inventoryLock as any,
      clientRepo as any,
    );

    await uc.execute({ saleOrderId: "id-1" });

    expect(inventoryLock.lockSnapshots).toHaveBeenCalledWith(
      expect.arrayContaining([
        { warehouseId: "wh-1", stockItemId: "stock-1" },
        { warehouseId: "wh-1", stockItemId: "stock-2" },
      ]),
      expect.anything(),
    );

    expect(inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      { warehouseId: "wh-1", stockItemId: "stock-1", locationId: null, delta: -3 },
      expect.anything(),
    );
    expect(inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      { warehouseId: "wh-1", stockItemId: "stock-2", locationId: null, delta: -4 },
      expect.anything(),
    );

    expect(saleOrderRepo.updateStatuses).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: "id-1",
        agendaStatus: AgendaStatus.CANCELED,
        deliveryStatus: DeliveryStatus.CANCELED,
      }),
      expect.anything(),
    );

    expect(clientRepo.update).not.toHaveBeenCalled();
  });
});
