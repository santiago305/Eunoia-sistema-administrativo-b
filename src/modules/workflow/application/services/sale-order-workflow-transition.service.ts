import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { ConditionFactory } from "src/modules/workflow/domain/factories/condition.factory";
import { WorkflowEngine } from "src/modules/workflow/domain/services/workflow-engine";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "src/modules/workflow/domain/ports/workflow.repository";
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from "src/modules/workflow/domain/ports/workflow-transition.repository";
import { SALE_ORDER_STATE_HISTORY_REPOSITORY, SaleOrderStateHistoryRepository } from "src/modules/workflow/domain/ports/sale-order-state-history.repository";
import { SaleOrderStateHistory } from "src/modules/workflow/domain/entities/sale-order-state-history";
import { SaleOrderWorkflowContextService } from "./sale-order-workflow-context.service";
import { SaleOrderWorkflowActionRunnerService } from "./sale-order-workflow-action-runner.service";
import { WorkflowTransitionPurpose } from "../../domain/constants/workflow-transition-purpose.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";

type AdvanceStateInput = {
  saleOrderId: string;
  executedBy: string;
  transitionId?: string;
  transitionCode?: string;
  transitionPurpose?: WorkflowTransitionPurpose;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class SaleOrderWorkflowTransitionService {
  private readonly engine = new WorkflowEngine();

  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly workflowTransitionRepo: WorkflowTransitionRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly contextService: SaleOrderWorkflowContextService,
    private readonly actionRunner: SaleOrderWorkflowActionRunnerService,
  ) {}

  async advance(input: AdvanceStateInput, tx: TransactionContext) {
    const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
    if (!order) {
      throw new BadRequestException("Pedido no encontrado");
    }
    if (!order.workflowId || !order.currentStateId) {
      throw new BadRequestException("El pedido no tiene flujo asignado");
    }

    const workflowAggregate = await this.workflowRepo.findDetailedById(order.workflowId, tx);
    if (!workflowAggregate) {
      throw new BadRequestException("Flujo no encontrado");
    }

    const currentState = workflowAggregate.states.find((state) => state.id === order.currentStateId);
    if (!currentState) {
      throw new BadRequestException("Estado actual invalido");
    }

    const transitionBundle = input.transitionId
      ? await this.workflowTransitionRepo.findDetailedById(input.transitionId, tx)
      : (await this.workflowTransitionRepo.listFromState(order.workflowId, order.currentStateId, tx)).find(
          (item) =>
            (input.transitionPurpose && item.transition.purpose === input.transitionPurpose) ||
            (input.transitionCode && item.transition.code === input.transitionCode),
        ) ?? null;

    if (!transitionBundle) {
      throw new BadRequestException("Transicion no disponible");
    }

    const isActionOnly = transitionBundle.transition.effect === TRANSITION_EFFECTS.RUN_ACTIONS;
    const toState = transitionBundle.transition.toStateId
      ? workflowAggregate.states.find((state) => state.id === transitionBundle.transition.toStateId)
      : null;
    if (!isActionOnly && !toState) {
      throw new BadRequestException("Estado destino invalido");
    }

    const conditions = transitionBundle.conditions.map((condition) => ConditionFactory.create(condition));
    const context = await this.contextService.build(order, currentState, tx);
    const decision = this.engine.canTransition({
      workflow: workflowAggregate.workflow,
      currentState,
      transition: transitionBundle.transition,
      conditions,
      toState,
      context,
    });

    if (!decision.allowed) {
      throw new UnprocessableEntityException({ failures: decision.failures });
    }

    await this.actionRunner.run(order, transitionBundle.actions, tx);

    const updated = isActionOnly
      ? order
      : await this.saleOrderRepo.updateWorkflowState(
          {
            saleOrderId: order.id,
            currentStateId: transitionBundle.transition.toStateId as string,
          },
          tx,
        );

    await this.historyRepo.append(
      new SaleOrderStateHistory({
        id: crypto.randomUUID(),
        saleOrderId: order.id,
        workflowId: order.workflowId,
        transitionId: transitionBundle.transition.id,
        fromStateId: order.currentStateId,
        toStateId: transitionBundle.transition.toStateId ?? order.currentStateId,
        executedBy: input.executedBy,
        executedAt: this.clock.now(),
        metadata: input.metadata ?? null,
      }),
      tx,
    );

    return updated;
  }

  async advanceAutomatic(saleOrderId: string, executedBy: string, tx: TransactionContext) {
    const order = await this.saleOrderRepo.findByIdForUpdate(saleOrderId, tx);
    if (!order?.workflowId || !order.currentStateId) {
      return null;
    }
    const aggregate = await this.workflowRepo.findDetailedById(order.workflowId, tx);
    const currentState = aggregate?.states.find((state) => state.id === order.currentStateId);
    if (!aggregate || !currentState) {
      return null;
    }

    const context = await this.contextService.build(order, currentState, tx);
    const bundles = (await this.workflowTransitionRepo.listFromState(order.workflowId, order.currentStateId, tx))
      .filter(({ transition }) => transition.autoTrigger && transition.isActive)
      .sort((a, b) => a.transition.priority - b.transition.priority || a.transition.id.localeCompare(b.transition.id));

    for (const bundle of bundles) {
      const evaluations = this.engine.evaluateConditions(
        bundle.conditions.map((condition) => ConditionFactory.create(condition)),
        context,
      );
      const passed = evaluations.every((evaluation) => evaluation.passed);
      const effect = passed ? bundle.transition.effect : bundle.transition.elseEffect;
      const toStateId = passed ? bundle.transition.toStateId : bundle.transition.elseToStateId;
      const actions = bundle.actions.filter((action) => action.branch === (passed ? "THEN" : "ELSE"));

      if (!passed && !effect) {
        continue;
      }
      if (effect === TRANSITION_EFFECTS.MOVE_STATE && !toStateId) {
        throw new BadRequestException("Estado destino automatico invalido");
      }
      if (effect === TRANSITION_EFFECTS.RUN_ACTIONS && !actions.length) {
        throw new BadRequestException("Rama automatica de acciones sin acciones");
      }

      await this.actionRunner.run(order, actions, tx);
      const updated =
        effect === TRANSITION_EFFECTS.RUN_ACTIONS
          ? order
          : await this.saleOrderRepo.updateWorkflowState({ saleOrderId: order.id, currentStateId: toStateId }, tx);
      await this.historyRepo.append(
        new SaleOrderStateHistory({
          id: crypto.randomUUID(),
          saleOrderId: order.id,
          workflowId: order.workflowId,
          transitionId: bundle.transition.id,
          fromStateId: order.currentStateId,
          toStateId: toStateId ?? order.currentStateId,
          executedBy,
          executedAt: this.clock.now(),
          metadata: { source: "automatic-workflow", branch: passed ? "THEN" : "ELSE" },
        }),
        tx,
      );
      return updated;
    }

    return null;
  }
}
