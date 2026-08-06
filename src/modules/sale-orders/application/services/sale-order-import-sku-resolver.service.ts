import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { PRODUCT_CATALOG_INVENTORY_REPOSITORY, ProductCatalogInventoryRepository } from "src/modules/product-catalog/domain/ports/inventory.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { ProductCatalogInventoryBalance } from "src/modules/product-catalog/domain/entities/inventory-balance";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

@Injectable()
export class SaleOrderImportSkuResolverService {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY) private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY) private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY) private readonly inventoryRepo: ProductCatalogInventoryRepository,
    private readonly createProductCatalogStockItem: CreateProductCatalogStockItem,
  ) {}

  async resolveOrCreateSkus(
    products: Array<{
      rawCode: string;
      productName: string;
      variantName: string | null;
      skuName: string;
      customSku: string;
      quantity: number;
    }>,
    tx?: TransactionContext,
  ) {
    const resolved: Array<{ productId: string; skuId: string; skuName: string; customSku: string; quantity: number }> = [];

    for (const item of products) {
      const sku = await this.resolveOrCreateSku(item, tx);
      resolved.push({
        productId: sku.productId,
        skuId: sku.skuId,
        skuName: item.skuName,
        customSku: item.customSku,
        quantity: item.quantity,
      });
    }

    return resolved;
  }

  private async resolveOrCreateSku(
    input: { productName: string; variantName: string | null; skuName: string; customSku: string },
    tx?: TransactionContext,
  ) {
    const existingSku = await this.skuRepo.findByCustomSku(input.customSku);
    if (existingSku) {
      const productId = this.getEntityId((existingSku as any).sku?.productId ?? (existingSku as any).productId);
      const skuId = this.getEntityId(
        (existingSku as any).sku?.id ??
          (existingSku as any).sku?.skuId ??
          (existingSku as any).skuId ??
          (existingSku as any).id,
      );

      await this.ensureStockItemAndSnapshots(skuId, tx);
      return { productId, skuId };
    }

    throw new BadRequestException(
      `El SKU personalizado ${input.customSku} no existe en el catalogo. Registrelo antes de importar el pedido.`,
    );
  }

  private async ensureStockItemAndSnapshots(skuId: string, tx?: TransactionContext): Promise<void> {
    if (!tx) return;

    let stockItem = await this.stockItemRepo.findBySkuId(skuId, tx);
    if (!stockItem) {
      try {
        stockItem = await this.createProductCatalogStockItem.execute({ skuId, isActive: true }, tx);
      } catch (error: any) {
        stockItem = await this.stockItemRepo.findBySkuId(skuId, tx);
        if (!stockItem) throw error;
      }
    }

    await this.ensureZeroSnapshots(stockItem.id, tx);
  }

  private async listActiveWarehouseIds(tx: TransactionContext): Promise<string[]> {
    const manager = (tx as TypeormTransactionContext).manager;
    const rows = await manager.query(`
      SELECT id
      FROM warehouses
      WHERE is_active = true
    `);
    return (rows ?? []).map((row: any) => String(row.id)).filter(Boolean);
  }

  private async ensureZeroSnapshots(stockItemId: string, tx: TransactionContext): Promise<void> {
    const activeWarehouseIds = await this.listActiveWarehouseIds(tx);
    if (!activeWarehouseIds.length) return;

    const existing = await this.inventoryRepo.listByStockItemId(stockItemId, tx);
    const existingWarehouseIds = new Set(existing.map((balance) => balance.warehouseId));

    for (const warehouseId of activeWarehouseIds) {
      if (existingWarehouseIds.has(warehouseId)) continue;
      await this.inventoryRepo.upsert(
        new ProductCatalogInventoryBalance(warehouseId, stockItemId, null, 0, 0, 0),
        tx,
      );
    }
  }

  private getEntityId(value: any): string {
    if (typeof value === "string") return value;
    if (value?.value) return value.value;
    if (value?.id) return value.id;
    throw new BadRequestException("No se pudo resolver el ID de entidad");
  }
}

