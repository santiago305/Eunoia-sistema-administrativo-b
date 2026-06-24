import { Injectable } from "@nestjs/common";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { RunAutomaticWorkflowTransitionsJob } from "src/modules/workflow/application/jobs/run-automatic-workflow-transitions.job";

export enum SaleOrderAutomaticWorkflowTriggerEnum {
  SALE_ORDER_CREATED = "sale-order-created",
  SALE_ORDER_IMPORTED = "sale-order-imported",
  SALE_ORDER_UPDATED = "sale-order-updated",
  WORKFLOW_STATE_CHANGED = "workflow-state-changed",
  WORKFLOW_ASSIGNED = "workflow-assigned",
  SALE_ORDER_CANCELLED = "sale-order-cancelled",
  DELIVERY_CONFIRMED = "delivery-confirmed",
  PAYMENT_CREATED = "payment-created",
  PAYMENT_DELETED = "payment-deleted",
}

@Injectable()
export class SaleOrderAutomaticWorkflowService {
  constructor(
    private readonly automaticWorkflowJob: RunAutomaticWorkflowTransitionsJob,
    private readonly realtimeService: SaleOrdersRealtimeService,
  ) {}

  async evaluateAndNotify(saleOrderId: string, trigger: SaleOrderAutomaticWorkflowTriggerEnum) {
    const result = await this.automaticWorkflowJob.runForSaleOrder({ saleOrderId });

    if (result.updated) {
      this.realtimeService.emitToAllConnected("sale-orders.updated", {
        updated: result.updated,
        saleOrderIds: result.saleOrderIds,
        source: "automatic-workflow",
        trigger,
      });
    }

    return result;
  }
}
