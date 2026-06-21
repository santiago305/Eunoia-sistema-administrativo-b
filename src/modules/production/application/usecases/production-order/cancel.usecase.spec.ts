import { CancelProductionOrder } from "./cancel.usecase";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

describe("CancelProductionOrder", () => {
  const tx = { manager: {} };
  const uow = {
    runInTransaction: jest.fn((callback: (tx: unknown) => unknown) => callback(tx)),
  };
  const orderRepo = {
    getByIdWithItems: jest.fn(),
    removeItem: jest.fn(),
    setStatus: jest.fn(),
  };
  const buildConsumption = { execute: jest.fn() };
  const reserveMaterials = { execute: jest.fn() };
  const reserveSkuMaterials = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    uow.runInTransaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(tx));
    orderRepo.removeItem.mockResolvedValue(true);
    orderRepo.setStatus.mockResolvedValue(undefined);
    buildConsumption.execute.mockResolvedValue([]);
    reserveMaterials.execute.mockResolvedValue(undefined);
    reserveSkuMaterials.execute.mockResolvedValue(undefined);
  });

  it("releases reserved materials before cancelling an in-progress production order", async () => {
    const order = {
      productionId: "production-1",
      fromWarehouseId: "warehouse-1",
      status: ProductionStatus.IN_PROGRESS,
      assertCanCancel: jest.fn(),
    };
    const items = [{ productionItemId: "item-1" }];
    orderRepo.getByIdWithItems.mockResolvedValue({ order, items });
    buildConsumption.execute.mockResolvedValue([
      { stockItemId: "legacy-stock", locationId: "loc-1", qty: 2, mode: "legacy" },
      { stockItemId: "sku-stock", locationId: "loc-2", qty: 3, mode: "sku" },
    ]);

    const usecase = new (CancelProductionOrder as any)(
      uow,
      orderRepo,
      buildConsumption,
      reserveMaterials,
      reserveSkuMaterials,
    ) as CancelProductionOrder;

    await usecase.execute({ productionId: "production-1" }, "user-1");

    expect(reserveMaterials.execute).toHaveBeenCalledWith(
      {
        warehouseId: "warehouse-1",
        consumption: [{ stockItemId: "legacy-stock", locationId: "loc-1", qty: 2, mode: "legacy" }],
        reserveMode: false,
      },
      tx,
    );
    expect(reserveSkuMaterials.execute).toHaveBeenCalledWith({
      warehouseId: "warehouse-1",
      consumption: [{ stockItemId: "sku-stock", locationId: "loc-2", qty: 3 }],
      reserveMode: false,
    });
    expect(orderRepo.setStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        productionId: "production-1",
        status: ProductionStatus.CANCELLED,
        updatedBy: "user-1",
      }),
      tx,
    );
  });
});
