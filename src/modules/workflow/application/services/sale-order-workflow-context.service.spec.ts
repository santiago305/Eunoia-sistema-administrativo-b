import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { SaleOrderWorkflowContextService } from "./sale-order-workflow-context.service";

describe("SaleOrderWorkflowContextService", () => {
  const order = new SaleOrder(
    "order-1",
    "SO",
    1,
    "warehouse-1",
    "client-1",
    null,
    null,
    null,
    null,
    10,
    0,
    10,
    null,
    "user-1",
    "workflow-1",
    "state-1",
    true,
    new Date("2026-06-06T00:00:00.000Z"),
    null,
  );
  const currentState = {
    id: "state-1",
    workflowId: "workflow-1",
    code: "PENDING",
    isActive: true,
  } as any;

  function buildService(snapshot: { onHand: number; reserved: number } | null) {
    return new SaleOrderWorkflowContextService(
      { listBySaleOrderIds: jest.fn().mockResolvedValue([]) } as any,
      { getSnapshot: jest.fn().mockResolvedValue(snapshot) } as any,
      { now: () => new Date("2026-06-06T00:00:00.000Z") } as any,
      { resolve: jest.fn().mockResolvedValue([{ stockItemId: "stock-1", quantity: 4 }]) } as any,
    );
  }

  it("reports stock when unreserved availability covers the requirement", async () => {
    const context = await buildService({ onHand: 10, reserved: 3 }).build(order, currentState);

    expect(context.hasStock).toBe(true);
  });

  it("rejects stock when existing reservations consume the availability", async () => {
    const context = await buildService({ onHand: 10, reserved: 7 }).build(order, currentState);

    expect(context.hasStock).toBe(false);
  });
});
