import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogInventoryLedgerEntry } from "src/modules/product-catalog/domain/entities/inventory-ledger-entry";
import { ProductCatalogInventoryLedgerRepository } from "src/modules/product-catalog/domain/ports/inventory-ledger.repository";
import { ProductCatalogInventoryLedgerEntity } from "../entities/inventory-ledger.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class ProductCatalogInventoryLedgerTypeormRepository implements ProductCatalogInventoryLedgerRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryLedgerEntity)
    private readonly repo: Repository<ProductCatalogInventoryLedgerEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogInventoryLedgerEntity);
  }

  async append(entries: ProductCatalogInventoryLedgerEntry[], tx?: TransactionContext): Promise<void> {
    if (!entries.length) return;
    await this.getRepo(tx).save(
      entries.map((entry) => ({
        docId: entry.docId,
        docItemId: entry.docItemId,
        warehouseId: entry.warehouseId,
        stockItemId: entry.stockItemId,
        direction: entry.direction,
        quantity: entry.quantity,
        locationId: entry.locationId,
        wasteQty: entry.wasteQty ?? 0,
        unitCost: entry.unitCost,
      })),
    );
  }

  async listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryLedgerEntry[]> {
    const rows = await this.getRepo(tx).find({
      where: { stockItemId },
      order: { createdAt: "DESC" },
    });
    return rows.map(
      (row) =>
        new ProductCatalogInventoryLedgerEntry(
          row.id,
          row.docId,
          row.docItemId,
          row.warehouseId,
          row.stockItemId,
          row.direction,
          row.quantity,
          row.locationId,
          row.wasteQty !== null && row.wasteQty !== undefined ? Number(row.wasteQty) : null,
          row.unitCost !== null && row.unitCost !== undefined ? Number(row.unitCost) : null,
          row.createdAt,
        ),
    );
  }

  async updateWasteByDocItem(input: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean> {
    const result = await this.getRepo(tx).update({ docItemId: input.docItemId }, { wasteQty: input.wasteQty });
    return (result.affected ?? 0) > 0;
  }
}
