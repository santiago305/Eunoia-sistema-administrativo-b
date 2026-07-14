import { HttpException, Injectable, Inject, Logger } from "@nestjs/common";
import { SaleOrderWorkflowRouteResult } from "src/modules/workflow/application/dtos/sale-order-workflow-route.output";
import { AdvanceSaleOrderToTargetStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-to-target-state.usecase";
import {
  SALE_ORDER_STATES_REPOSITORY,
  SaleOrderStatesRepository,
} from "src/modules/workflow/domain/ports/sale-order-states.repository";
import { CancelSaleOrderUsecase } from "./cancel.usecase";

@Injectable()
export class BulkChangeSaleOrderStateUsecase {
  private readonly logger = new Logger(BulkChangeSaleOrderStateUsecase.name);

  constructor(
    private readonly advanceSaleOrderToTargetState: AdvanceSaleOrderToTargetStateUseCase,
    private readonly cancelSaleOrder: CancelSaleOrderUsecase,
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository,
  ) {}

  async execute(input: {
    saleOrderIds: string[];
    targetStateId: string;
    executedBy: string;
  }) {
    const results: SaleOrderWorkflowRouteResult[] = [];
    const isCancellation = await this.isCancellationTarget(input.targetStateId);

    for (const saleOrderId of input.saleOrderIds) {
      const result = isCancellation
        ? await this.cancelOrder(saleOrderId, input.targetStateId)
        : await this.advanceSaleOrderToTargetState.execute({
            saleOrderId,
            targetStateId: input.targetStateId,
            executedBy: input.executedBy,
          });
      results.push(result);
    }

    const succeeded = results.filter((row) => row.status === "success").length;
    const failed = results.length - succeeded;
    const partiallyCompleted = results.filter(
      (row) => row.status === "failed" && row.completedTransitions.length > 0,
    ).length;

    return {
      type: "success",
      message: "Operacion masiva procesada",
      data: {
        targetStateId: input.targetStateId,
        requested: input.saleOrderIds.length,
        succeeded,
        failed,
        partiallyCompleted,
        results,
      },
    };
  }

  private async isCancellationTarget(targetStateId: string): Promise<boolean> {
    const targetState = await this.saleOrderStatesRepo.findById(targetStateId);
    return targetState?.code?.toUpperCase() === "CANCELLED";
  }

  private async cancelOrder(saleOrderId: string, targetStateId: string): Promise<SaleOrderWorkflowRouteResult> {
    try {
      await this.cancelSaleOrder.execute({ saleOrderId });
      return {
        saleOrderId,
        targetStateId,
        status: "success",
        initialState: null,
        finalState: null,
        completedTransitions: [],
        warnings: [],
      };
    } catch (error) {
      return this.mapCancellationFailure(saleOrderId, targetStateId, error);
    }
  }

  private mapCancellationFailure(
    saleOrderId: string,
    targetStateId: string,
    error: unknown,
  ): SaleOrderWorkflowRouteResult {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const body = typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
      const details = typeof body.details === "object" && body.details !== null
        ? (body.details as Record<string, unknown>)
        : undefined;
      const code = details?.code;
      return {
        saleOrderId,
        targetStateId,
        status: "failed",
        initialState: null,
        finalState: null,
        completedTransitions: [],
        warnings: [],
        message: typeof body.message === "string" ? body.message : error.message,
        failure: {
          code: code === "CONDITION_FAILED" || code === "ACTION_FAILED" ? code : "ROUTE_INVALIDATED",
          message: typeof body.message === "string" ? body.message : error.message,
          ...(details ? { details } : {}),
        },
      };
    }

    this.logger.error("Unexpected sale order cancellation failure", error instanceof Error ? error.stack : String(error));
    return {
      saleOrderId,
      targetStateId,
      status: "failed",
      initialState: null,
      finalState: null,
      completedTransitions: [],
      warnings: [],
      message: "No se pudo cancelar el pedido",
      failure: {
        code: "UNEXPECTED_ERROR",
        message: "No se pudo cancelar el pedido",
      },
    };
  }
}
