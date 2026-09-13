import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { RunAutomaticWorkflowTransitionsJob } from "src/modules/workflow/application/jobs/run-automatic-workflow-transitions.job";
import { SaleOrderRealtimePayloadService } from "./sale-order-realtime-payload.service";
import {
  UNIT_OF_WORK,
  UnitOfWork,
} from "src/shared/domain/ports/unit-of-work.port";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderStockCorrectionService } from "./sale-order-stock-correction.service";

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
  CLIENT_UPDATED = "client-updated",
  INVENTORY_UPDATED = "inventory-updated",
}

@Injectable()
export class SaleOrderAutomaticWorkflowService {
  constructor(
    private readonly automaticWorkflowJob: RunAutomaticWorkflowTransitionsJob,
    private readonly realtimeService: SaleOrdersRealtimeService,
    private readonly payloadBuilder: SaleOrderRealtimePayloadService,
    @Optional() @Inject(UNIT_OF_WORK) private readonly uow?: UnitOfWork,
    @Optional()
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo?: SaleOrderRepository,
    @Optional()
    private readonly stockCorrection?: SaleOrderStockCorrectionService,
  ) {}

  async evaluateAndNotify(saleOrderId: string, trigger: SaleOrderAutomaticWorkflowTriggerEnum) {
    const result = await this.automaticWorkflowJob.runForSaleOrder({ saleOrderId });

    if (result.updated) {
      const payload = await this.payloadBuilder.build({
        updated: result.updated,
        saleOrderIds: result.saleOrderIds,
        source: "automatic-workflow",
        trigger,
      });
      this.realtimeService.emitToAllConnected("sale-orders.updated", payload);
    }

    return result;
  }

  async evaluateManyAndNotify(
    saleOrderIds: string[],
    trigger: SaleOrderAutomaticWorkflowTriggerEnum,
  ): Promise<{ found: number; updated: number; failed: number; saleOrderIds: string[] }> {
    const uniqueSaleOrderIds = Array.from(new Set(saleOrderIds));
    const aggregate = {
      found: uniqueSaleOrderIds.length,
      updated: 0,
      failed: 0,
      saleOrderIds: [] as string[],
    };

    for (const saleOrderId of uniqueSaleOrderIds) {
      let reservationUpdated = false;
      if (trigger === SaleOrderAutomaticWorkflowTriggerEnum.INVENTORY_UPDATED) {
        try {
          reservationUpdated = await this.retryActiveReservation(saleOrderId);
        } catch {
          aggregate.failed += 1;
          continue;
        }
      }

      const result = await this.automaticWorkflowJob.runForSaleOrder({ saleOrderId });
      aggregate.updated += reservationUpdated || result.updated ? 1 : 0;
      aggregate.failed += result.failed;
      if (reservationUpdated) aggregate.saleOrderIds.push(saleOrderId);
      aggregate.saleOrderIds.push(...result.saleOrderIds);
    }

    aggregate.saleOrderIds = Array.from(new Set(aggregate.saleOrderIds));

    if (aggregate.updated) {
      const payload = await this.payloadBuilder.build({
        updated: aggregate.updated,
        saleOrderIds: aggregate.saleOrderIds,
        source: "automatic-workflow",
        trigger,
      });
      this.realtimeService.emitToAllConnected("sale-orders.updated", payload);
    }

    return aggregate;
  }

  private async retryActiveReservation(saleOrderId: string): Promise<boolean> {
    if (!this.uow || !this.saleOrderRepo || !this.stockCorrection) return false;

    try {
      return await this.uow.runInTransaction(async (tx) => {
        const order = await this.saleOrderRepo!.findByIdForUpdate(
          saleOrderId,
          tx,
        );
        if (!order?.isActive || order.reserveBool !== true) return false;

        const result = await this.stockCorrection!.reconcileCurrentReservation(
          order,
          tx,
        );
        return result.adjusted;
      });
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      if (
        error instanceof BadRequestException &&
        (message.includes("Stock insuficiente") ||
          message.includes("No existe stock"))
      ) {
        return false;
      }
      throw error;
    }
  }
}
