import { Inject, Injectable } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { StockItemRepository } from "src/modules/product-catalog/compat/ports/stock-item.repository.port";
import { StockItem } from "src/modules/product-catalog/compat/entities/stock-item";
import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";

@Injectable()
export class StockItemBridge implements StockItemRepository {
  constructor(
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly repo: ProductCatalogStockItemRepository,
  ) {}
  async findById(stockItemId: string): Promise<StockItem | null> {
    const row = await this.repo.findById(stockItemId);
    return row ? StockItem.create({ stockItemId: row.id, type: StockItemType.PRODUCT, isActive: row.isActive }) : null;
  }
  async findByProductId(): Promise<StockItem | null> { return null; }
  async findByProductOrStockItemId(itemId: string): Promise<StockItem | null> { return this.findById(itemId); }
  async findByType(): Promise<StockItem[]> { return []; }
  async create(): Promise<StockItem> { throw new Error("Legacy stock item create no soportado en ProductCatalog bridge"); }
  async setActive(stockItemId: string, isActive: boolean): Promise<void> { await this.repo.setActive(stockItemId, isActive); }
}


