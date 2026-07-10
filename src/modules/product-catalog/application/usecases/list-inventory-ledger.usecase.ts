import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "../../domain/ports/inventory-ledger.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { parseInventoryRangeDate } from "../support/inventory-date-range";

@Injectable()
export class ListProductCatalogInventoryLedger {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly repo: ProductCatalogInventoryLedgerRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
  ) {}

  async execute(
    input: {
      skuId?: string;
      stockItemId?: string;
      warehouseId?: string;
      from?: string;
      to?: string;
    },
    tx?: TransactionContext,
  ) {
    if (tx) return this.executeInTx(input, tx);
    return this.uow.runInTransaction((nextTx) => this.executeInTx(input, nextTx));
  }
  private async executeInTx(
    input: {
      skuId?: string;
      stockItemId?: string;
      warehouseId?: string;
      from?: string;
      to?: string;
    },
    tx: TransactionContext,
  ) {
    const from = parseInventoryRangeDate(input.from, "start");
    const toExclusive = parseInventoryRangeDate(input.to, "endExclusive");

    if (from === null) {
      throw new BadRequestException("Fecha 'from' invalida");
    }
    if (toExclusive === null) {
      throw new BadRequestException("Fecha 'to' invalida");
    }

    let stockItemId = input.stockItemId;
    if (!stockItemId) {
      if (!input.skuId) throw new BadRequestException("skuId requerido");
      const stockItem = await this.stockItemRepo.findBySkuId(input.skuId, tx);
      if (!stockItem?.id) {
        throw new NotFoundException("Stock item no encontrado para este sku");
      }
      stockItemId = stockItem.id;
    }
    return this.repo.list(
      {
        stockItemId,
        warehouseId: input.warehouseId,
        from: from ?? undefined,
        toExclusive: toExclusive ?? undefined,
      },
      tx,
    );
  }
}
