import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import {
  SALE_ORDER_IMPORT_LOTE_REPOSITORY,
  SaleOrderImportLoteRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-import-lote.repository";
import { SaleOrderImportLoteOutput } from "../../dtos/sale-order-import-lote.output";

@Injectable()
export class AssignImportLoteUsecase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY) private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_IMPORT_LOTE_REPOSITORY) private readonly loteRepo: SaleOrderImportLoteRepository,
  ) {}

  async execute(input: { saleOrderIds: string[]; createdBy: string }): Promise<SaleOrderImportLoteOutput | null> {
    const saleOrderIds = Array.from(new Set((input.saleOrderIds ?? []).filter(Boolean)));
    if (!saleOrderIds.length) return null;
    if (!input.createdBy) throw new BadRequestException("Usuario requerido para crear lote");

    return this.uow.runInTransaction(async (tx) => {
      const lote = await this.loteRepo.reserveNextLote(tx);
      const record = await this.loteRepo.create({ lote, createdBy: input.createdBy, isActive: true }, tx);
      await this.saleOrderRepo.setLoteByIds({ saleOrderIds, lote }, tx);

      return {
        id: record.id,
        lote: record.lote,
        createdAt: record.createdAt.toISOString(),
        createdBy: { id: record.createdBy, name: record.createdByName, email: record.createdByEmail },
        isActive: record.isActive,
      };
    });
  }
}
