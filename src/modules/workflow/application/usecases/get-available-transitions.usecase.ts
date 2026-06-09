import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { ConditionFactory } from "../../domain/factories/condition.factory";
import { WorkflowEngine } from "../../domain/services/workflow-engine";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from "../../domain/ports/workflow-transition.repository";
import { SaleOrderWorkflowContextService } from "../services/sale-order-workflow-context.service";

@Injectable()
export class GetAvailableTransitionsUseCase {
  private readonly engine = new WorkflowEngine();

  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly transitionRepo: WorkflowTransitionRepository,
    private readonly contextService: SaleOrderWorkflowContextService,
  ) {}

  async execute(input: { saleOrderId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) {
        throw new BadRequestException("Pedido no encontrado");
      }
      if (!order.workflowId || !order.currentStateId) {
        return [];
      }

      const aggregate = await this.workflowRepo.findDetailedById(order.workflowId, tx);
      if (!aggregate) {
        throw new BadRequestException("Workflow no encontrado");
      }
      const currentState = aggregate.states.find((state) => state.id === order.currentStateId);
      if (!currentState) {
        throw new BadRequestException("Estado actual invalido");
      }

      const context = await this.contextService.build(order, currentState, tx);
      const bundles = await this.transitionRepo.listFromState(order.workflowId, order.currentStateId, tx);

      return bundles.map((bundle) => {
        const targetState = aggregate.states.find((state) => state.id === bundle.transition.toStateId) ?? null;
        const decision = this.engine.canTransition({
          workflow: aggregate.workflow,
          currentState,
          transition: bundle.transition,
          conditions: bundle.conditions.map((condition) => ConditionFactory.create(condition)),
          context,
          toState: targetState,
        });

        return {
          id: bundle.transition.id,
          code: bundle.transition.code,
          name: bundle.transition.name,
          fromState: currentState,
          toState: targetState,
          available: decision.allowed,
          failures: decision.failures,
          conditions: bundle.conditions,
        };
      });
    });
  }
}
