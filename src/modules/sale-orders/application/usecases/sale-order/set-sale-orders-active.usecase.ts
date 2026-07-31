import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderDeactivationService } from "../../services/sale-order-deactivation.service";

type SaleOrderActiveResult = {
  saleOrderId: string;
  status: "success" | "failed";
  message?: string;
};

@Injectable()
export class SetSaleOrdersActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY) private readonly saleOrderRepo: SaleOrderRepository,
    @Optional() private readonly deactivation?: SaleOrderDeactivationService,
  ) {}

  async execute(input: { saleOrderIds: string[]; isActive: boolean; executedBy: string }) {
    const saleOrderIds = [...new Set((input.saleOrderIds ?? []).filter(Boolean))];
    if (!saleOrderIds.length) {
      throw new BadRequestException("Debe seleccionar al menos un pedido");
    }

    const actionExecution = input.isActive ? "restore" : "delete";

    if (!input.isActive && this.deactivation) {
      const results: SaleOrderActiveResult[] = [];
      for (const saleOrderId of saleOrderIds) {
        try {
          await this.uow.runInTransaction((tx) => this.deactivation!.deactivate(saleOrderId, input.executedBy, tx));
          results.push({ saleOrderId, status: "success" });
        } catch (error: any) {
          results.push({ saleOrderId, status: "failed", message: error?.message ?? "No se pudo eliminar el pedido" });
        }
      }
      const succeeded = results.filter((row) => row.status === "success").length;
      return { type: "success" as const, message: "Operacion masiva procesada", data: {
        requested: saleOrderIds.length,
        succeeded,
        failed: results.length - succeeded,
        partiallyCompleted: succeeded > 0 && succeeded < results.length,
        results,
      }};
    }

    const updatedIds = await this.uow.runInTransaction(async (tx) => {
      const ids = await this.saleOrderRepo.setActiveByIds({ saleOrderIds, isActive: input.isActive }, tx);
      for (const saleOrderId of ids) {
        await this.saleOrderRepo.createAudit(
          { saleOrderId, executedBy: input.executedBy, actionExecution },
          tx,
        );
      }
      return ids;
    });

    const updated = new Set(updatedIds);
    const results: SaleOrderActiveResult[] = saleOrderIds.map((saleOrderId) => (
      updated.has(saleOrderId)
        ? { saleOrderId, status: "success" }
        : { saleOrderId, status: "failed", message: "Pedido no encontrado" }
    ));
    const succeeded = results.filter((row) => row.status === "success").length;
    const failed = results.length - succeeded;

    return {
      type: "success" as const,
      message: "Operacion masiva procesada",
      data: {
        requested: saleOrderIds.length,
        succeeded,
        failed,
        partiallyCompleted: succeeded > 0 && failed > 0,
        results,
      },
    };
  }
}
