import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from "../../domain/ports/sale-order-state-history.repository";

@Injectable()
export class GetOrderTimelineUseCase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
  ) {}

  async execute(input: { saleOrderId: string }) {
    const order = await this.saleOrderRepo.findById(input.saleOrderId);
    if (!order) {
      throw new BadRequestException("Pedido no encontrado");
    }

    const history = await this.historyRepo.listBySaleOrderId(input.saleOrderId);
    const workflowIds = Array.from(new Set(history.map((entry) => entry.workflowId)));
    const aggregates = await Promise.all(workflowIds.map((workflowId) => this.workflowRepo.findDetailedById(workflowId)));
    const states = new Map(
      aggregates.flatMap((aggregate) => aggregate?.states ?? []).map((state) => [state.id, state]),
    );
    const transitions = new Map(
      aggregates.flatMap((aggregate) => aggregate?.transitions ?? []).map((transition) => [transition.id, transition]),
    );

    return history.map((entry) => ({
      id: entry.id,
      workflowId: entry.workflowId,
      transition: entry.transitionId ? transitions.get(entry.transitionId) ?? null : null,
      fromState: entry.fromStateId ? states.get(entry.fromStateId) ?? null : null,
      toState: states.get(entry.toStateId) ?? { id: entry.toStateId },
      executedBy: entry.executedBy,
      executedAt: entry.executedAt,
      metadata: entry.metadata,
    }));
  }
}
