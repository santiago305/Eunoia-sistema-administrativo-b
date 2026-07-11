import { Injectable } from "@nestjs/common";
import { SaleOrderWorkflowRouteResult } from "src/modules/workflow/application/dtos/sale-order-workflow-route.output";
import { AdvanceSaleOrderToTargetStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-to-target-state.usecase";

@Injectable()
export class BulkChangeSaleOrderStateUsecase {
  constructor(private readonly advanceSaleOrderToTargetState: AdvanceSaleOrderToTargetStateUseCase) {}

  async execute(input: {
    saleOrderIds: string[];
    targetStateId: string;
    executedBy: string;
  }) {
    const results: SaleOrderWorkflowRouteResult[] = [];

    for (const saleOrderId of input.saleOrderIds) {
      const result = await this.advanceSaleOrderToTargetState.execute({
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
}
