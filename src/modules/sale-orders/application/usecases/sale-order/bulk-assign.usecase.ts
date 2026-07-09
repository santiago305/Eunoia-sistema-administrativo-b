import { Inject, Injectable } from "@nestjs/common";
import { AdviserMembershipService } from "../../services/adviser-membership.service";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";

type BulkActionResultRow =
  | { saleOrderId: string; status: "success" }
  | { saleOrderId: string; status: "failed"; message: string };

@Injectable()
export class BulkAssignSaleOrdersUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    private readonly adviserMembership: AdviserMembershipService,
  ) {}

  async execute(input: { saleOrderIds: string[]; assignedBy?: string | null }) {
    const assignedBy = input.assignedBy ?? null;
    await this.adviserMembership.assertIsAdviser(assignedBy);

    const results: BulkActionResultRow[] = [];

    for (const saleOrderId of input.saleOrderIds) {
      try {
        await this.uow.runInTransaction(async (tx) => {
          const updated = await this.saleOrderRepo.updateAssignedBy(
            { saleOrderId, assignedBy },
            tx,
          );
          if (!updated) {
            throw new Error("Pedido no encontrado");
          }
        });
        results.push({ saleOrderId, status: "success" });
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
