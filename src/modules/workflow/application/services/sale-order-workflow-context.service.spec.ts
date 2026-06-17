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
      { findById: jest.fn().mockResolvedValue(null) } as any,
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

  it("adds controlled sale-order and client fields to workflow variables", async () => {
    const service = new SaleOrderWorkflowContextService(
      { listBySaleOrderIds: jest.fn().mockResolvedValue([]) } as any,
      { getSnapshot: jest.fn().mockResolvedValue({ onHand: 10, reserved: 0 }) } as any,
      { now: () => new Date("2026-06-06T00:00:00.000Z") } as any,
      { resolve: jest.fn().mockResolvedValue([{ stockItemId: "stock-1", quantity: 4 }]) } as any,
      {
        findById: jest.fn().mockResolvedValue({
          docNumber: "12345678",
          address: "Av. Lima 123",
          reference: "Referencia",
          docType: "DNI",
        }),
      } as any,
    );
    const orderWithFields = new SaleOrder(
      "order-1",
      "SO",
      1,
      "warehouse-1",
      "client-1",
      "Agencia central",
      "source-1",
      "2026-06-18",
      "2026-06-20",
      10,
      0,
      10,
      "Nota interna",
      "user-1",
      "workflow-1",
      "state-1",
      true,
      new Date("2026-06-06T00:00:00.000Z"),
      null,
    );

    const context = await service.build(orderWithFields, currentState);

    expect(context.variables).toEqual(
      expect.objectContaining({
        "client.docNumber": "12345678",
        "client.address": "Av. Lima 123",
        "client.reference": "Referencia",
        "client.docType": "DNI",
        deliveryDate: "2026-06-20",
        scheduleDate: "2026-06-18",
        warehouseId: "warehouse-1",
        sourceId: "source-1",
        agencyDetail: "Agencia central",
        note: "Nota interna",
      }),
    );
  });
});
