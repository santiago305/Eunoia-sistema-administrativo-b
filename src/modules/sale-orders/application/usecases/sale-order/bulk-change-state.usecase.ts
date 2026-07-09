import { Injectable } from "@nestjs/common";
import { AdvanceSaleOrderStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-state.usecase";

type BulkStateResultRow =
  | { saleOrderId: string; status: "success"; warnings?: string[] }
  | { saleOrderId: string; status: "failed"; message: string };

@Injectable()
export class BulkChangeSaleOrderStateUsecase {
  constructor(private readonly advanceSaleOrderState: AdvanceSaleOrderStateUseCase) {}

  async execute(input: {
    saleOrderIds: string[];
    transitionId: string;
    metadata?: Record<string, unknown>;
    executedBy: string;
  }) {
    const results: BulkStateResultRow[] = [];

    for (const saleOrderId of input.saleOrderIds) {
      try {
        const result = await this.advanceSaleOrderState.execute({
          saleOrderId,
          transitionId: input.transitionId,
          metadata: input.metadata,
          executedBy: input.executedBy,
        });

        results.push({
          saleOrderId,
          status: "success",
          ...(result.warnings?.length ? { warnings: result.warnings } : {}),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado";
        results.push({ saleOrderId, status: "failed", message });
      }
    }

    const succeeded = results.filter((row) => row.status === "success").length;

    return {
      type: "success",
      message: "Operacion masiva procesada",
      data: {
        requested: input.saleOrderIds.length,
        succeeded,
        failed: input.saleOrderIds.length - succeeded,
        results,
      },
    };
  }
}
