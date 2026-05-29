import { ConfirmSaleOrderDeliveryUsecase } from "./confirm-delivery.usecase";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";

describe("ConfirmSaleOrderDeliveryUsecase", () => {
  it("throws when order not found", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue(null) };

    const uc = new ConfirmSaleOrderDeliveryUsecase(
      uow as any,
      saleOrderRepo as any,
      { listBySaleOrderId: jest.fn() } as any,
      { listBySaleOrderItemIds: jest.fn() } as any,
      { findBySkuId: jest.fn() } as any,
      { getSnapshot: jest.fn(), incrementReserved: jest.fn(), incrementOnHand: jest.fn() } as any,
      { lockSnapshots: jest.fn() } as any,
      { update: jest.fn() } as any,
    );

    await expect(uc.execute({ saleOrderId: "id-1" })).rejects.toThrow("Pedido no encontrado");
  });

  it("throws when already delivered", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "id-1",
        warehouseId: "wh-1",
        clientId: "c-1",
        agendaStatus: AgendaStatus.PROGRAMMED,
        deliveryStatus: DeliveryStatus.DELIVERED,
      }),
    };

    const uc = new ConfirmSaleOrderDeliveryUsecase(
      uow as any,
      saleOrderRepo as any,
      { listBySaleOrderId: jest.fn() } as any,
      { listBySaleOrderItemIds: jest.fn() } as any,
      { findBySkuId: jest.fn() } as any,
      { getSnapshot: jest.fn(), incrementReserved: jest.fn(), incrementOnHand: jest.fn() } as any,
      { lockSnapshots: jest.fn() } as any,
      { update: jest.fn() } as any,
    );

    await expect(uc.execute({ saleOrderId: "id-1" })).rejects.toThrow("ya entregado");
  });

  it("consumes reserved stock, marks delivered, and updates client type", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "id-1",
        warehouseId: "wh-1",
        clientId: "client-1",
        agendaStatus: AgendaStatus.PROGRAMMED,
        deliveryStatus: DeliveryStatus.IN_PROGRESS,
      }),
      updateStatuses: jest.fn().mockResolvedValue({ id: "id-1", deliveryStatus: DeliveryStatus.DELIVERED }),
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
    const inventoryRepo = {
      getSnapshot: jest.fn()
        .mockResolvedValueOnce({ reserved: 3, onHand: 10 })
        .mockResolvedValueOnce({ reserved: 4, onHand: 10 }),
      incrementReserved: jest.fn().mockResolvedValue(undefined),
      incrementOnHand: jest.fn().mockResolvedValue(undefined),
    };
    const clientRepo = { update: jest.fn().mockResolvedValue({ id: "client-1" }) };

    const uc = new ConfirmSaleOrderDeliveryUsecase(
      uow as any,
      saleOrderRepo as any,
      saleOrderItemRepo as any,
      componentRepo as any,
      stockItemRepo as any,
      inventoryRepo as any,
      inventoryLock as any,
      clientRepo as any,
    );

    const result = await uc.execute({ saleOrderId: "id-1" });

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
    expect(inventoryRepo.incrementOnHand).toHaveBeenCalledWith(
      { warehouseId: "wh-1", stockItemId: "stock-1", locationId: null, delta: -3 },
      expect.anything(),
    );

    expect(inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      { warehouseId: "wh-1", stockItemId: "stock-2", locationId: null, delta: -4 },
      expect.anything(),
    );
    expect(inventoryRepo.incrementOnHand).toHaveBeenCalledWith(
      { warehouseId: "wh-1", stockItemId: "stock-2", locationId: null, delta: -4 },
      expect.anything(),
    );

    expect(saleOrderRepo.updateStatuses).toHaveBeenCalledWith(
      expect.objectContaining({ saleOrderId: "id-1", deliveryStatus: DeliveryStatus.DELIVERED }),
      expect.anything(),
    );

    expect(clientRepo.update).toHaveBeenCalledWith(
      { clientId: "client-1", type: ClientType.NEW },
      expect.anything(),
    );

    expect(result).toEqual({ saleOrderId: "id-1", deliveryStatus: DeliveryStatus.DELIVERED });
  });
});

