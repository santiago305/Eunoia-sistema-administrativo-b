import { BadRequestException } from "@nestjs/common";
import { SaleOrderWorkflowActionRunnerService } from "./sale-order-workflow-action-runner.service";

describe("SaleOrderWorkflowActionRunnerService", () => {
  const order = { id: "order-1", warehouseId: "warehouse-1" } as any;
  const tx = {} as any;

  function setup(
    snapshot = { available: 10, reserved: 10, onHand: 10 },
    options: { hasActiveReservation?: boolean } = {},
  ) {
    const requirements = {
      resolve: jest.fn().mockResolvedValue([{ stockItemId: "stock-1", quantity: 3 }]),
    };
    const inventory = {
      getSnapshot: jest.fn().mockResolvedValue(snapshot),
      incrementReserved: jest.fn().mockResolvedValue(undefined),
      incrementOnHand: jest.fn().mockResolvedValue(undefined),
    };
    const lock = { lockSnapshots: jest.fn().mockResolvedValue(undefined) };
    const saleOrders = { markInvoiceSent: jest.fn().mockResolvedValue(undefined) };
    const history = {
      listBySaleOrderId: jest.fn().mockResolvedValue(
        options.hasActiveReservation === false
          ? []
          : [{ transitionId: "reserve-transition" }],
      ),
    };
    const transitions = {
      findDetailedById: jest.fn().mockResolvedValue({
        actions: [{ type: "RESERVE_STOCK", position: 0 }],
      }),
    };
    const consumption = { consume: jest.fn().mockResolvedValue(undefined) };
    const warehouseAssignment = {
      assign: jest.fn().mockImplementation(async (_order, _config) => ({
        order: { ..._order, warehouseId: _config.warehouseId },
        outcome: {
          actionType: "ASSIGN_WAREHOUSE_BY_PROVINCE",
          status: "APPLIED",
        },
      })),
    };
    return {
      runner: new SaleOrderWorkflowActionRunnerService(
        requirements as any,
        inventory as any,
        lock as any,
        saleOrders as any,
        history as any,
        transitions as any,
        consumption as any,
        warehouseAssignment as any,
      ),
      requirements,
      inventory,
      lock,
      saleOrders,
      history,
      transitions,
      consumption,
      warehouseAssignment,
    };
  }

  it.each([
    ["RESERVE_STOCK", 3, 0],
    ["REVERT_STOCK", -3, 0],
  ] as const)("executes %s with the expected inventory deltas", async (type, reservedDelta, onHandDelta) => {
    const { runner, inventory } = setup();

    await runner.run(order, [{ id: "a1", transitionId: "t1", type, config: {}, position: 0 } as any], tx);

    expect(inventory.incrementReserved).toHaveBeenCalledWith(
      { warehouseId: "warehouse-1", stockItemId: "stock-1", locationId: null, delta: reservedDelta },
      tx,
    );
    if (onHandDelta) {
      expect(inventory.incrementOnHand).toHaveBeenCalledWith(
        { warehouseId: "warehouse-1", stockItemId: "stock-1", locationId: null, delta: onHandDelta },
        tx,
      );
    } else {
      expect(inventory.incrementOnHand).not.toHaveBeenCalled();
    }
  });

  it("uses an assigned warehouse for a later stock action", async () => {
    const { runner, inventory, warehouseAssignment } = setup();
    const orderWithoutWarehouse = { id: "order-1", warehouseId: null } as any;

    const result = await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: "a1",
          transitionId: "t1",
          type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
          config: {
            mode: "INCLUDE",
            provinceIds: ["1501"],
            warehouseId: "22222222-2222-4222-8222-222222222222",
          },
          position: 0,
        } as any,
        { id: "a2", transitionId: "t1", type: "RESERVE_STOCK", config: {}, position: 1 } as any,
      ],
      tx,
    );

    expect(warehouseAssignment.assign).toHaveBeenCalled();
    expect(inventory.incrementReserved).toHaveBeenCalledWith(
      { warehouseId: "22222222-2222-4222-8222-222222222222", stockItemId: "stock-1", locationId: null, delta: 3 },
      tx,
    );
    expect(result.order.warehouseId).toBe("22222222-2222-4222-8222-222222222222");
    expect(result.outcomes).toEqual([
      { actionType: "ASSIGN_WAREHOUSE_BY_PROVINCE", status: "APPLIED" },
    ]);
  });

  it("rejects invalid persisted warehouse assignment config at runtime", async () => {
    const { runner, warehouseAssignment } = setup();

    await expect(
      runner.run(
        { id: "order-1", warehouseId: null } as any,
        [{
          id: "a1",
          transitionId: "t1",
          type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
          config: { mode: "INCLUDE", provinceIds: [], warehouseId: "invalid" },
          position: 0,
        } as any],
        tx,
      ),
    ).rejects.toThrow("Configuracion de asignacion de almacen invalida");
    expect(warehouseAssignment.assign).not.toHaveBeenCalled();
  });

  it("marks the invoice as sent without requiring a warehouse", async () => {
    const { runner, saleOrders, requirements } = setup();
    const orderWithoutWarehouse = { id: "order-1", warehouseId: null, invoiceSend: true } as any;

    await runner.run(
      orderWithoutWarehouse,
      [{ id: "a1", transitionId: "t1", type: "MARK_INVOICE_SENT", config: {}, position: 0 } as any],
      tx,
    );

    expect(saleOrders.markInvoiceSent).toHaveBeenCalledWith("order-1", tx);
    expect(requirements.resolve).not.toHaveBeenCalled();
  });

  it("validates every snapshot before applying mutations", async () => {
    const { runner, inventory } = setup({ available: 2, reserved: 2, onHand: 2 });

    await expect(
      runner.run(
        order,
        [{ id: "a1", transitionId: "t1", type: "RESERVE_STOCK", config: {}, position: 0 } as any],
        tx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it("continues reverting stock when the order has no warehouse", async () => {
    const { runner, requirements, inventory } = setup();
    const orderWithoutWarehouse = { id: "order-1", warehouseId: null } as any;

    await runner.run(
      orderWithoutWarehouse,
      [{ id: "a1", transitionId: "t1", type: "REVERT_STOCK", config: {}, position: 0 } as any],
      tx,
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it.each([
    [0, 0],
    [2, -2],
  ])("reverts only the existing reserved stock when reserved is %s", async (reserved, expectedDelta) => {
    const { runner, inventory } = setup({ available: 10 - reserved, reserved, onHand: 10 });

    await runner.run(
      order,
      [{ id: "a1", transitionId: "t1", type: "REVERT_STOCK", config: {}, position: 0 } as any],
      tx,
    );

    if (expectedDelta === 0) {
      expect(inventory.incrementReserved).not.toHaveBeenCalled();
    } else {
      expect(inventory.incrementReserved).toHaveBeenCalledWith(
        { warehouseId: "warehouse-1", stockItemId: "stock-1", locationId: null, delta: expectedDelta },
        tx,
      );
    }
  });

  it("continues reverting stock when the inventory snapshot does not exist", async () => {
    const { runner, inventory } = setup(null as any);

    await runner.run(
      order,
      [{ id: "a1", transitionId: "t1", type: "REVERT_STOCK", config: {}, position: 0 } as any],
      tx,
    );

    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it("delegates stock consumption to one inventory document operation", async () => {
    const { runner, consumption, inventory } = setup();

    await runner.run(
      order,
      [{ id: "a1", transitionId: "t1", type: "CONSUME_STOCK", config: {}, position: 0 } as any],
      tx,
    );

    expect(consumption.consume).toHaveBeenCalledWith(
      order,
      [{ stockItemId: "stock-1", quantity: 3 }],
      tx,
    );
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
    expect(inventory.incrementOnHand).not.toHaveBeenCalled();
  });

  it("does not revert reservations owned by other orders when this order never reserved stock", async () => {
    const { runner, inventory, requirements } = setup(
      { available: 0, reserved: 10, onHand: 10 },
      { hasActiveReservation: false },
    );

    await runner.run(
      order,
      [{ id: "a1", transitionId: "t1", type: "REVERT_STOCK", config: {}, position: 0 } as any],
      tx,
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });
});
