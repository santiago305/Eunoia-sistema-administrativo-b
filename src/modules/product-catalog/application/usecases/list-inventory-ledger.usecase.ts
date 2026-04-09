import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "../../domain/ports/inventory-ledger.repository";

@Injectable()
export class ListProductCatalogInventoryLedger {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly repo: ProductCatalogInventoryLedgerRepository,
  ) {}

  execute(stockItemId: string) {
    return this.repo.listByStockItemId(stockItemId);
  }
}
