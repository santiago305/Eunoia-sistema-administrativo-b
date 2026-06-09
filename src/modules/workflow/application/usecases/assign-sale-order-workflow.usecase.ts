import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderStateHistory } from "../../domain/entities/sale-order-state-history";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from "../../domain/ports/sale-order-state-history.repository";

@Injectable()
export class AssignSaleOrderWorkflowUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: { saleOrderId: string; workflowId: string; executedBy: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) {
        throw new BadRequestException("Pedido no encontrado");
      }
      if (order.workflowId || order.currentStateId) {
        throw new BadRequestException("El pedido ya tiene workflow asignado");
      }

      const resolved = await this.workflowRepo.findDetailedById(input.workflowId, tx);
      const initialStates = resolved?.states.filter((state) => state.isActive && state.isInitial) ?? [];
      if (!resolved?.workflow.isActive || initialStates.length !== 1) {
        throw new BadRequestException("Workflow invalido para asignar al pedido");
      }

      const initialState = initialStates[0];
      const updated = await this.saleOrderRepo.updateWorkflowState(
        {
          saleOrderId: order.id,
          workflowId: resolved.workflow.id,
          currentStateId: initialState.id,
        },
        tx,
      );

      await this.historyRepo.append(
        new SaleOrderStateHistory({
          id: crypto.randomUUID(),
          saleOrderId: order.id,
          workflowId: resolved.workflow.id,
          transitionId: null,
          fromStateId: null,
          toStateId: initialState.id,
          executedBy: input.executedBy,
          executedAt: this.clock.now(),
          metadata: { source: "workflow-assignment" },
        }),
        tx,
      );

      return updated;
    });
  }
}
