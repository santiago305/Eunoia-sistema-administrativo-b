import { Subject } from "rxjs";
import { ClientRealtimeMessage } from "src/modules/clients/integration/client/ports/client-realtime.port";
import { StockUpdatedEvent } from "src/modules/product-catalog/integration/inventory/ports/inventory-realtime.port";
import { SaleOrderAutomaticWorkflowTriggerEnum } from "./sale-order-automatic-workflow.service";
import { WorkflowReactivityOrchestratorService } from "./workflow-reactivity-orchestrator.service";

type InventoryMessage = { type: string; payload: StockUpdatedEvent };

const stockEvent = (overrides?: Partial<StockUpdatedEvent>): StockUpdatedEvent => ({
  warehouseId: "warehouse-1",
  stockItemId: "stock-1",
  locationId: null,
  onHand: 10,
  reserved: 0,
  available: 10,
  occurredAt: "2026-06-25T10:00:00.000Z",
  ...overrides,
});

const createService = () => {
  const clientStream = new Subject<ClientRealtimeMessage>();
  const inventoryStream = new Subject<InventoryMessage>();
  const clientRealtime = { stream: jest.fn().mockReturnValue(clientStream.asObservable()) };
  const inventoryRealtime = { stream: jest.fn().mockReturnValue(inventoryStream.asObservable()) };
  const saleOrderRepo = {
    listIdsForAutomaticWorkflowByClientId: jest.fn(),
    listIdsForAutomaticWorkflowByInventoryStockEvent: jest.fn(),
  };
  const automaticWorkflow = {
    evaluateManyAndNotify: jest.fn(),
  };
  const workflowRealtime = {
    emitToAllConnected: jest.fn(),
  };
  const service = new WorkflowReactivityOrchestratorService(
    clientRealtime as any,
    inventoryRealtime as any,
    saleOrderRepo as any,
    automaticWorkflow as any,
    workflowRealtime as any,
  );

  return { service, clientStream, inventoryStream, saleOrderRepo, automaticWorkflow, workflowRealtime };
};

describe("WorkflowReactivityOrchestratorService", () => {
  it("automatically processes workflow candidates after client updates", async () => {
    const { service, saleOrderRepo, automaticWorkflow, workflowRealtime } = createService();
    saleOrderRepo.listIdsForAutomaticWorkflowByClientId.mockResolvedValue(["order-1"]);
    automaticWorkflow.evaluateManyAndNotify.mockResolvedValue({
      found: 1,
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    await expect(
      service.handleClientUpdated({
        clientId: "client-1",
        changedFields: ["client.docNumber"],
        occurredAt: "2026-06-25T10:00:00.000Z",
      }),
    ).resolves.toEqual({
      found: 1,
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    expect(saleOrderRepo.listIdsForAutomaticWorkflowByClientId).toHaveBeenCalledWith("client-1", 100);
    expect(automaticWorkflow.evaluateManyAndNotify).toHaveBeenCalledWith(
      ["order-1"],
      SaleOrderAutomaticWorkflowTriggerEnum.CLIENT_UPDATED,
    );
    expect(workflowRealtime.emitToAllConnected).toHaveBeenCalledWith(
      "workflow-reactivity.processing",
      expect.objectContaining({ source: "client", trigger: "client-updated", clientId: "client-1" }),
    );
    expect(workflowRealtime.emitToAllConnected).toHaveBeenCalledWith(
      "workflow-reactivity.processed",
      expect.objectContaining({ source: "client", trigger: "client-updated", updated: 1 }),
    );
  });

  it("automatically processes workflow candidates after inventory stock updates", async () => {
    const { service, saleOrderRepo, automaticWorkflow, workflowRealtime } = createService();
    saleOrderRepo.listIdsForAutomaticWorkflowByInventoryStockEvent.mockResolvedValue(["order-1"]);
    automaticWorkflow.evaluateManyAndNotify.mockResolvedValue({
      found: 1,
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    await expect(service.handleStockUpdated(stockEvent())).resolves.toEqual({
      found: 1,
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    expect(saleOrderRepo.listIdsForAutomaticWorkflowByInventoryStockEvent).toHaveBeenCalledWith(
      { warehouseId: "warehouse-1", stockItemId: "stock-1" },
      100,
    );
    expect(automaticWorkflow.evaluateManyAndNotify).toHaveBeenCalledWith(
      ["order-1"],
      SaleOrderAutomaticWorkflowTriggerEnum.INVENTORY_UPDATED,
    );
    expect(workflowRealtime.emitToAllConnected).toHaveBeenCalledWith(
      "workflow-reactivity.processed",
      expect.objectContaining({ source: "inventory", trigger: "inventory-updated", updated: 1 }),
    );
  });

  it("skips location-scoped inventory updates", async () => {
    const { service, saleOrderRepo, automaticWorkflow, workflowRealtime } = createService();

    await expect(service.handleStockUpdated(stockEvent({ locationId: "location-1" }))).resolves.toEqual({
      found: 0,
      updated: 0,
      failed: 0,
      saleOrderIds: [],
    });

    expect(saleOrderRepo.listIdsForAutomaticWorkflowByInventoryStockEvent).not.toHaveBeenCalled();
    expect(automaticWorkflow.evaluateManyAndNotify).not.toHaveBeenCalled();
    expect(workflowRealtime.emitToAllConnected).toHaveBeenCalledWith(
      "workflow-reactivity.skipped",
      expect.objectContaining({ source: "inventory", reason: "location-scoped-stock" }),
    );
  });

  it("subscribes and unsubscribes to client and inventory streams", () => {
    const { service, clientStream, inventoryStream } = createService();

    service.onModuleInit();
    expect(clientStream.observed).toBe(true);
    expect(inventoryStream.observed).toBe(true);

    service.onModuleDestroy();
    expect(clientStream.observed).toBe(false);
    expect(inventoryStream.observed).toBe(false);
  });
});
