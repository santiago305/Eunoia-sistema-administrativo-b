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
import { Direction } from "src/shared/domain/value-objects/direction";

type DailyMovementTotal = { day: string; entrada: number; salida: number; balance: number };

@Injectable()
export class ListDailyMovementBySku {
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
    const from = new Date(input.from);
    const toExclusive = new Date(input.to);

    if (!from || !toExclusive) {
      throw new BadRequestException("from y to requeridos");
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

    const rows = await this.repo.list(
      {
        stockItemId,
        warehouseId: input.warehouseId,
        from,
        toExclusive,
      },
      tx,
    );

    const totalsByDay = new Map<string, DailyMovementTotal>();
    for (const row of rows) {
      const dayKey = new Date(row.createdAt).toISOString();
      const current = totalsByDay.get(dayKey) ?? { day: dayKey, entrada: 0, salida: 0, balance: 0 };

      if (row.direction === Direction.IN) current.entrada += row.quantity ?? 0;
      if (row.direction === Direction.OUT) current.salida += row.quantity ?? 0;
      current.balance = current.entrada - current.salida;

      totalsByDay.set(dayKey, current);
    }

    return Array.from(totalsByDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }
}
