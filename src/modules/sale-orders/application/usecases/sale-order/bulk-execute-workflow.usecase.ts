import { BadRequestException, HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { AdvanceSaleOrderStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-state.usecase";
import { TRANSITION_EFFECTS } from "src/modules/workflow/domain/constants/workflow-transition-effect.constants";
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from "src/modules/workflow/domain/ports/workflow-transition.repository";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { BulkChangeSaleOrderStateUsecase } from "./bulk-change-state.usecase";

type BulkExecuteInput = {
  saleOrderIds: string[];
  mode: "state" | "global_action";
  targetStateId?: string;
  transitionId?: string;
  globalActionName?: string;
  executedBy: string;
};

@Injectable()
export class BulkExecuteSaleOrderWorkflowUsecase {
  private readonly logger = new Logger(BulkExecuteSaleOrderWorkflowUsecase.name);

  constructor(
    private readonly bulkChangeState: BulkChangeSaleOrderStateUsecase,
    private readonly advanceSaleOrderState: AdvanceSaleOrderStateUseCase,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly workflowTransitionRepo: WorkflowTransitionRepository,
  ) {}

  async execute(input: BulkExecuteInput) {
    if (input.mode === "state") {
      if (!input.targetStateId) {
        throw new BadRequestException("Estado destino requerido");
      }

      return this.bulkChangeState.execute({
        saleOrderIds: input.saleOrderIds,
        targetStateId: input.targetStateId,
        executedBy: input.executedBy,
      });
    }

    const globalActionName = input.globalActionName?.trim();
    if (!input.transitionId && !globalActionName) {
      throw new BadRequestException("Accion global requerida");
    }

    const results = [];
    for (const saleOrderId of input.saleOrderIds) {
      try {
        const resolved = await this.uow.runInTransaction((tx) =>
          this.resolveGlobalActionTransition({
            saleOrderId,
            transitionId: input.transitionId,
            globalActionName,
          }, tx),
        );
        if ("status" in resolved) {
          results.push(resolved);
          continue;
        }

        const result = await this.advanceSaleOrderState.execute({
          saleOrderId,
          transitionId: resolved.transitionId,
          executedBy: input.executedBy,
          metadata: { source: "sale-orders-bulk-global-action" },
        });
        results.push({
          saleOrderId,
          transitionId: resolved.transitionId,
          status: "success",
          warnings: result.warnings ?? [],
          actionOutcomes: result.actionOutcomes ?? [],
        });
      } catch (error) {
        results.push(this.mapFailure(saleOrderId, input.transitionId ?? null, error));
      }
    }

    const succeeded = results.filter((row) => row.status === "success").length;
    const failed = results.length - succeeded;

    return {
      type: "success",
      message: "Operacion masiva procesada",
      data: {
        mode: input.mode,
        ...(input.transitionId ? { transitionId: input.transitionId } : {}),
        ...(globalActionName ? { globalActionName } : {}),
        requested: input.saleOrderIds.length,
        succeeded,
        failed,
        results,
      },
    };
  }

  private async resolveGlobalActionTransition(input: {
    saleOrderId: string;
    transitionId?: string;
    globalActionName?: string;
  }, tx: TransactionContext) {
    const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
    if (!order) {
      return this.buildUnavailableFailure(
        input.saleOrderId,
        input.transitionId,
        "Pedido no encontrado",
        "SALE_ORDER_NOT_FOUND",
      );
    }
    if (!order.workflowId || !order.currentStateId) {
      return this.buildUnavailableFailure(
        input.saleOrderId,
        input.transitionId,
        "El pedido no tiene flujo asignado",
        "WORKFLOW_NOT_ASSIGNED",
      );
    }

    const transitions = await this.workflowTransitionRepo.listFromState(order.workflowId, order.currentStateId, tx);
    const targetName = this.normalizeActionName(input.globalActionName ?? "");
    const match = transitions.find(({ transition }) => {
      if (!this.isEnabledGlobalAction(transition)) return false;
      if (input.transitionId) return transition.id === input.transitionId;
      return this.normalizeActionName(transition.name || transition.code) === targetName;
    });

    if (!match) {
      return this.buildUnavailableFailure(
        input.saleOrderId,
        input.transitionId,
        "La accion global no esta habilitada para el pedido",
        "GLOBAL_ACTION_NOT_AVAILABLE",
      );
    }

    return { transitionId: match.transition.id };
  }

  private isEnabledGlobalAction(transition: {
    effect: string;
    isActive?: boolean;
    isGlobal: boolean;
  }) {
    return transition.isGlobal &&
      transition.effect === TRANSITION_EFFECTS.RUN_ACTIONS &&
      transition.isActive !== false;
  }

  private normalizeActionName(value: string) {
    return value
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  }

  private buildUnavailableFailure(
    saleOrderId: string,
    transitionId: string | undefined,
    message: string,
    code: string,
  ) {
    return {
      saleOrderId,
      ...(transitionId ? { transitionId } : {}),
      status: "failed",
      message,
      failure: {
        code,
        message,
      },
    };
  }

  private mapFailure(saleOrderId: string, transitionId: string | null, error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const body = typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
      const details = typeof body.details === "object" && body.details !== null
        ? (body.details as Record<string, unknown>)
        : {};
      const code = typeof details.code === "string" ? details.code : "ROUTE_INVALIDATED";

      return {
        saleOrderId,
        ...(transitionId ? { transitionId } : {}),
        status: "failed",
        message: typeof body.message === "string" ? body.message : error.message,
        failure: {
          code,
          message: typeof body.message === "string" ? body.message : error.message,
          details,
        },
      };
    }

    this.logger.error(
      "Unexpected sale order bulk action failure",
      error instanceof Error ? error.stack : String(error),
    );
    return {
      saleOrderId,
      ...(transitionId ? { transitionId } : {}),
      status: "failed",
      message: "No se pudo ejecutar la accion global",
      failure: {
        code: "UNEXPECTED_ERROR",
        message: "No se pudo ejecutar la accion global",
      },
    };
  }
}
