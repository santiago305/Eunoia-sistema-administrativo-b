import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import {
  SALE_ORDER_IMPORT_LOTE_REPOSITORY,
  SaleOrderImportLoteRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-import-lote.repository";
import { SaleOrderImportLoteOutput } from "../../dtos/sale-order-import-lote.output";

@Injectable()
export class SetImportLoteActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY) private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_IMPORT_LOTE_REPOSITORY) private readonly loteRepo: SaleOrderImportLoteRepository,
  ) {}

  async execute(input: { loteId: string; isActive: boolean; executedBy: string }): Promise<{
    lote: SaleOrderImportLoteOutput;
    saleOrderIds: string[];
  }> {
    if (!input.executedBy) throw new BadRequestException("Usuario requerido para ejecutar accion");

    return this.uow.runInTransaction(async (tx) => {
      const current = await this.loteRepo.findByIdForUpdate(input.loteId, tx);
      if (!current) throw new BadRequestException("Lote de importacion no encontrado");

      const updated = await this.loteRepo.setActive({ id: input.loteId, isActive: input.isActive }, tx);
      const saleOrderIds = await this.saleOrderRepo.setActiveByLote({ lote: updated.lote, isActive: input.isActive }, tx);
      await this.loteRepo.createAudit({
        loteId: input.loteId,
        executedBy: input.executedBy,
        actionExecution: input.isActive ? "restore" : "delete",
      }, tx);

      return {
        lote: {
          id: updated.id,
          lote: updated.lote,
          createdAt: updated.createdAt.toISOString(),
          createdBy: { id: updated.createdBy, name: updated.createdByName, email: updated.createdByEmail },
          isActive: updated.isActive,
        },
        saleOrderIds,
      };
    });
  }
}
