import { BadRequestException } from "@nestjs/common";
import { SaleOrderWorkflowActionRunnerService } from "./sale-order-workflow-action-runner.service";

describe("SaleOrderWorkflowActionRunnerService", () => {
  const order = { id: "order-1", warehouseId: "warehouse-1" } as any;
  const tx = {} as any;

  function setup(snapshot = { available: 10, reserved: 10, onHand: 10 }) {
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
    return {
      runner: new SaleOrderWorkflowActionRunnerService(
        requirements as any,
        inventory as any,
        lock as any,
        saleOrders as any,
      ),
      requirements,
      inventory,
      lock,
      saleOrders,
    };
  }

  it.each([
    ["RESERVE_STOCK", 3, 0],
    ["CONSUME_STOCK", -3, -3],
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
});
