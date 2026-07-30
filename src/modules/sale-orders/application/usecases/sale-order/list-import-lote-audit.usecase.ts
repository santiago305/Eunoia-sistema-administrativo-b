import { Inject, Injectable } from "@nestjs/common";
import {
  SALE_ORDER_IMPORT_LOTE_REPOSITORY,
  SaleOrderImportLoteRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-import-lote.repository";
import { SaleOrderImportLoteAuditOutput } from "../../dtos/sale-order-import-lote.output";

@Injectable()
export class ListImportLoteAuditUsecase {
  constructor(
    @Inject(SALE_ORDER_IMPORT_LOTE_REPOSITORY)
    private readonly loteRepo: SaleOrderImportLoteRepository,
  ) {}

  async execute(loteId: string): Promise<SaleOrderImportLoteAuditOutput[]> {
    const rows = await this.loteRepo.listAudit(loteId);
    return rows.map((row) => ({
      id: row.id,
      loteId: row.loteId,
      createdAt: row.createdAt.toISOString(),
      executedBy: { id: row.executedBy, name: row.executedByName, email: row.executedByEmail },
      actionExecution: row.actionExecution,
    }));
  }
}
