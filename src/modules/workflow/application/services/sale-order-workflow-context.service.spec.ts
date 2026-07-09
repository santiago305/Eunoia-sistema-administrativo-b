import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { SaleOrderWorkflowContextService } from "./sale-order-workflow-context.service";

describe("SaleOrderWorkflowContextService", () => {
  const buildOrder = (overrides: Partial<Record<string, unknown>> = {}) => new SaleOrder(
    (overrides.id as string) ?? "order-1",
    (overrides.serie as string | null) ?? "SO",
    (overrides.correlative as number | null) ?? 1,
    (overrides.warehouseId as string | null) ?? "warehouse-1",
    (overrides.clientId as string) ?? "client-1",
    (overrides.agencySubsidiaryId as string | null) ?? null,
    (overrides.agencyDetail as string | null) ?? null,
    (overrides.sourceId as string | null) ?? null,
    (overrides.scheduleDate as string | null) ?? null,
    (overrides.deliveryDate as string | null) ?? null,
    (overrides.subTotal as number) ?? 10,
    (overrides.deliveryCost as number) ?? 0,
    (overrides.discount as number) ?? 0,
    (overrides.total as number) ?? 10,
    (overrides.note as string | null) ?? null,
    (overrides.advertisingCode as string | null) ?? null,
    (overrides.observation as string | null) ?? null,
    (overrides.sendDate as Date | null) ?? null,
    (overrides.sendPhoto as string | null) ?? null,
    (overrides.sendCode as string | null) ?? null,
    (overrides.sendAddress as string | null) ?? null,
    (overrides.assignedBy as string | null) ?? null,
    (overrides.createdBy as string) ?? "user-1",
    (overrides.workflowId as string | null) ?? "workflow-1",
    (overrides.currentStateId as string | null) ?? "state-1",
    (overrides.isActive as boolean) ?? true,
    (overrides.createdAt as Date) ?? new Date("2026-06-06T00:00:00.000Z"),
    (overrides.updatedAt as Date | null) ?? null,
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
    const context = await buildService({ onHand: 10, reserved: 3 }).build(buildOrder(), currentState);

    expect(context.hasStock).toBe(true);
  });

  it("rejects stock when existing reservations consume the availability", async () => {
    const context = await buildService({ onHand: 10, reserved: 7 }).build(buildOrder(), currentState);

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
          departmentId: "department-1",
          provinceId: "province-1",
          districtId: "district-1",
        }),
      } as any,
    );
    const orderWithFields = buildOrder({
      agencyDetail: "Agencia Norte",
      sourceId: "source-1",
      scheduleDate: "2026-06-18",
      deliveryDate: "2026-06-20",
      note: "Nota interna",
    });

    const context = await service.build(orderWithFields, currentState);

    expect(context.variables).toEqual(
      expect.objectContaining({
        "client.docNumber": "12345678",
        "client.address": "Av. Lima 123",
        "client.reference": "Referencia",
        "client.docType": "DNI",
        "client.departmentId": "department-1",
        "client.provinceId": "province-1",
        "client.districtId": "district-1",
        deliveryDate: "2026-06-20",
        scheduleDate: "2026-06-18",
        warehouseId: "warehouse-1",
        sourceId: "source-1",
        agencyDetail: "Agencia Norte",
        note: "Nota interna",
      }),
    );
  });
});
