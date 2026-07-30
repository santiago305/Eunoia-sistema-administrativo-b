import { Inject, Injectable } from "@nestjs/common";
import {
  SALE_ORDER_IMPORT_LOTE_REPOSITORY,
  SaleOrderImportLoteRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-import-lote.repository";
import { SaleOrderImportLoteOutput } from "../../dtos/sale-order-import-lote.output";

@Injectable()
export class ListImportLotesUsecase {
  constructor(
    @Inject(SALE_ORDER_IMPORT_LOTE_REPOSITORY)
    private readonly loteRepo: SaleOrderImportLoteRepository,
  ) {}

  async execute(): Promise<SaleOrderImportLoteOutput[]> {
    const rows = await this.loteRepo.list();
    return rows.map((row) => ({
      id: row.id,
      lote: row.lote,
      createdAt: row.createdAt.toISOString(),
      createdBy: { id: row.createdBy, name: row.createdByName, email: row.createdByEmail },
      isActive: row.isActive,
    }));
  }
}
