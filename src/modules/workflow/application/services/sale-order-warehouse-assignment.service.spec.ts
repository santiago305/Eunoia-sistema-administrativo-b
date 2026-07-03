import { BadRequestException } from "@nestjs/common";
import { SaleOrderWarehouseAssignmentService } from "./sale-order-warehouse-assignment.service";

describe("SaleOrderWarehouseAssignmentService", () => {
  const tx = {} as any;
  const config = {
    mode: "INCLUDE" as const,
    provinceIds: ["1501"],
    warehouseId: "22222222-2222-4222-8222-222222222222",
  };

  function setup(options: {
    provinceId?: string | null;
    warehouseActive?: boolean;
    assignedOrder?: any | null;
  } = {}) {
    const clients = {
      findById: jest.fn().mockResolvedValue({
        provinceId: options.provinceId === undefined ? "1501" : options.provinceId,
      }),
    };
    const warehouses = {
      findById: jest.fn().mockResolvedValue({
        isActive: options.warehouseActive ?? true,
      }),
    };
    const saleOrders = {
      assignWarehouseIfEmpty: jest.fn().mockResolvedValue(
        options.assignedOrder === undefined
          ? { id: "order-1", warehouseId: config.warehouseId }
          : options.assignedOrder,
      ),
    };
    return {
      service: new SaleOrderWarehouseAssignmentService(
        clients as any,
        warehouses as any,
        saleOrders as any,
      ),
      clients,
      warehouses,
      saleOrders,
    };
  }

  it("assigns the warehouse when INCLUDE matches the client province", async () => {
    const { service, saleOrders } = setup();

    const result = await service.assign(
      { id: "order-1", clientId: "client-1", warehouseId: null } as any,
      config,
      tx,
    );

    expect(saleOrders.assignWarehouseIfEmpty).toHaveBeenCalledWith(
      { saleOrderId: "order-1", warehouseId: config.warehouseId },
      tx,
    );
    expect(result.outcome.status).toBe("APPLIED");
    expect(result.order.warehouseId).toBe(config.warehouseId);
  });

  it("assigns the warehouse when EXCLUDE does not contain the client province", async () => {
    const { service, saleOrders } = setup({ provinceId: "0401" });

    await service.assign(
      { id: "order-1", clientId: "client-1", warehouseId: null } as any,
      { ...config, mode: "EXCLUDE" },
      tx,
    );

    expect(saleOrders.assignWarehouseIfEmpty).toHaveBeenCalled();
  });

  it.each([
    ["INCLUDE", "0401"],
    ["EXCLUDE", "1501"],
  ] as const)("skips when %s does not match province %s", async (mode, provinceId) => {
    const { service, saleOrders } = setup({ provinceId });

    const result = await service.assign(
      { id: "order-1", clientId: "client-1", warehouseId: null } as any,
      { ...config, mode },
      tx,
    );

    expect(result.outcome.status).toBe("SKIPPED");
    expect(result.outcome.message).toBeUndefined();
    expect(saleOrders.assignWarehouseIfEmpty).not.toHaveBeenCalled();
  });

  it("skips when the client has no province", async () => {
    const { service, saleOrders } = setup({ provinceId: null });

    const result = await service.assign(
      { id: "order-1", clientId: "client-1", warehouseId: null } as any,
      config,
      tx,
    );

    expect(result.outcome.status).toBe("SKIPPED");
    expect(saleOrders.assignWarehouseIfEmpty).not.toHaveBeenCalled();
  });

  it("skips with a warning when the order already has a warehouse", async () => {
    const { service, clients } = setup();

    const result = await service.assign(
      { id: "order-1", clientId: "client-1", warehouseId: "warehouse-existing" } as any,
      config,
      tx,
    );

    expect(result.outcome).toEqual({
      actionType: "ASSIGN_WAREHOUSE_BY_PROVINCE",
      status: "SKIPPED",
      message: "Ya hay un almacén seleccionado",
    });
    expect(clients.findById).not.toHaveBeenCalled();
  });

  it("treats a concurrent assignment as an existing warehouse", async () => {
    const { service } = setup({ assignedOrder: null });

    const result = await service.assign(
      { id: "order-1", clientId: "client-1", warehouseId: null } as any,
      config,
      tx,
    );

    expect(result.outcome.message).toBe("Ya hay un almacén seleccionado");
  });

  it("rejects an inactive warehouse", async () => {
    const { service } = setup({ warehouseActive: false });

    await expect(
      service.assign(
        { id: "order-1", clientId: "client-1", warehouseId: null } as any,
        config,
        tx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
