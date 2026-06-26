import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Subscription } from "rxjs";
import {
  CLIENT_REALTIME,
  ClientRealtime,
  ClientUpdatedEvent,
} from "src/modules/clients/integration/client/ports/client-realtime.port";
import {
  INVENTORY_REALTIME,
  InventoryRealtime,
  StockUpdatedEvent,
} from "src/modules/product-catalog/integration/inventory/ports/inventory-realtime.port";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { WorkflowReactivityRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/workflow-reactivity-realtime.service";
import {
  SaleOrderAutomaticWorkflowService,
  SaleOrderAutomaticWorkflowTriggerEnum,
} from "./sale-order-automatic-workflow.service";

const WORKFLOW_REACTIVITY_LIMIT = 100;
const EMPTY_RESULT = { found: 0, updated: 0, failed: 0, saleOrderIds: [] as string[] };

@Injectable()
export class WorkflowReactivityOrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowReactivityOrchestratorService.name);
  private readonly subscriptions = new Subscription();

  constructor(
    @Inject(CLIENT_REALTIME)
    private readonly clientRealtime: ClientRealtime,
    @Inject(INVENTORY_REALTIME)
    private readonly inventoryRealtime: InventoryRealtime,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    private readonly automaticWorkflow: SaleOrderAutomaticWorkflowService,
    private readonly workflowRealtime: WorkflowReactivityRealtimeService,
  ) {}

  onModuleInit() {
    this.subscriptions.add(
      this.clientRealtime.stream().subscribe((event) => {
        if (event.type !== "client.updated") return;
        void this.handleClientUpdated(event.payload).catch((error) =>
          this.emitFailed("client", SaleOrderAutomaticWorkflowTriggerEnum.CLIENT_UPDATED, error, {
            clientId: event.payload.clientId,
          }),
        );
      }),
    );

    this.subscriptions.add(
      this.inventoryRealtime.stream().subscribe((event) => {
        if (event.type !== "stock.updated") return;
        void this.handleStockUpdated(event.payload).catch((error) =>
          this.emitFailed("inventory", SaleOrderAutomaticWorkflowTriggerEnum.INVENTORY_UPDATED, error, {
            warehouseId: event.payload.warehouseId,
            stockItemId: event.payload.stockItemId,
          }),
        );
      }),
    );
  }

  onModuleDestroy() {
    this.subscriptions.unsubscribe();
  }

  async handleClientUpdated(event: ClientUpdatedEvent) {
    const trigger = SaleOrderAutomaticWorkflowTriggerEnum.CLIENT_UPDATED;
    this.workflowRealtime.emitToAllConnected("workflow-reactivity.processing", {
      source: "client",
      trigger,
      clientId: event.clientId,
      changedFields: event.changedFields,
      occurredAt: event.occurredAt,
    });

    const saleOrderIds = await this.saleOrderRepo.listIdsForAutomaticWorkflowByClientId(
      event.clientId,
      WORKFLOW_REACTIVITY_LIMIT,
    );

    if (!saleOrderIds.length) {
      this.workflowRealtime.emitToAllConnected("workflow-reactivity.skipped", {
        source: "client",
        trigger,
        reason: "no-candidates",
        clientId: event.clientId,
      });
      return EMPTY_RESULT;
    }

    const result = await this.automaticWorkflow.evaluateManyAndNotify(saleOrderIds, trigger);
    this.workflowRealtime.emitToAllConnected("workflow-reactivity.processed", {
      source: "client",
      trigger,
      ...result,
    });
    return result;
  }

  async handleStockUpdated(event: StockUpdatedEvent) {
    const trigger = SaleOrderAutomaticWorkflowTriggerEnum.INVENTORY_UPDATED;

    if (event.locationId !== null && event.locationId !== undefined) {
      this.workflowRealtime.emitToAllConnected("workflow-reactivity.skipped", {
        source: "inventory",
        trigger,
        reason: "location-scoped-stock",
        warehouseId: event.warehouseId,
        stockItemId: event.stockItemId,
        locationId: event.locationId,
      });
      return EMPTY_RESULT;
    }

    this.workflowRealtime.emitToAllConnected("workflow-reactivity.processing", {
      source: "inventory",
      trigger,
      warehouseId: event.warehouseId,
      stockItemId: event.stockItemId,
      occurredAt: event.occurredAt,
    });

    const saleOrderIds = await this.saleOrderRepo.listIdsForAutomaticWorkflowByInventoryStockEvent(
      { warehouseId: event.warehouseId, stockItemId: event.stockItemId },
      WORKFLOW_REACTIVITY_LIMIT,
    );

    if (!saleOrderIds.length) {
      this.workflowRealtime.emitToAllConnected("workflow-reactivity.skipped", {
        source: "inventory",
        trigger,
        reason: "no-candidates",
        warehouseId: event.warehouseId,
        stockItemId: event.stockItemId,
      });
      return EMPTY_RESULT;
    }

    const result = await this.automaticWorkflow.evaluateManyAndNotify(saleOrderIds, trigger);
    this.workflowRealtime.emitToAllConnected("workflow-reactivity.processed", {
      source: "inventory",
      trigger,
      ...result,
    });
    return result;
  }

  private emitFailed(
    source: "client" | "inventory",
    trigger: SaleOrderAutomaticWorkflowTriggerEnum,
    error: unknown,
    context: Record<string, unknown>,
  ) {
    const message = (error as Error)?.message ?? "unknown";
    this.logger.warn(`workflow reactivity failed source=${source}: ${message}`);
    this.workflowRealtime.emitToAllConnected("workflow-reactivity.failed", {
      source,
      trigger,
      message,
      ...context,
    });
  }
}
