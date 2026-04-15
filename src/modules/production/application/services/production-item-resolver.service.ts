import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/product-catalog/integration/inventory/ports/stock-item.repository.port";
import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY, ProductCatalogRecipeRepository } from "src/modules/product-catalog/domain/ports/recipe.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";

export interface ResolvedProductionFinishedItem {
  mode: "legacy" | "sku";
  stockItemId: string;
  legacyType?: StockItemType;
  legacyProductId?: string | null;
  skuId?: string;
}

export interface ResolvedConsumptionMaterial {
  mode: "legacy" | "sku";
  stockItemId: string;
  skuId?: string;
  quantity: number;
}

@Injectable()
export class ProductionItemResolverService {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly legacyStockItemRepo: StockItemRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly skuStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_RECIPE_REPOSITORY)
    private readonly skuRecipeRepo: ProductCatalogRecipeRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  async resolveFinishedItem(finishedItemId: string, tx?: TransactionContext): Promise<ResolvedProductionFinishedItem> {
    const legacy = await this.legacyStockItemRepo.findById(finishedItemId, tx);
    if (legacy) {
      return {
        mode: "legacy",
        stockItemId: legacy.stockItemId!,
        legacyType: legacy.type,
        legacyProductId: legacy.productId ?? null,
      };
    }

    const sku = await this.skuStockItemRepo.findById(finishedItemId);
    if (sku) {
      return {
        mode: "sku",
        stockItemId: sku.id!,
        skuId: sku.skuId,
      };
    }

    throw new NotFoundException("No se encontro el item de stock terminado");
  }

  async resolveRecipeConsumption(
    finishedItemId: string,
    quantity: number,
    tx?: TransactionContext,
  ): Promise<ResolvedConsumptionMaterial[]> {
    const target = await this.resolveFinishedItem(finishedItemId, tx);

    if (target.mode === "legacy") {
      throw new BadRequestException("Solo se admite produccion basada en SKU");
    }

    const activeRecipe = await this.skuRecipeRepo.findActiveBySkuId(target.skuId!);
    if (!activeRecipe) {
      throw new NotFoundException("Receta del sku no encontrada");
    }

    return Promise.all(
      activeRecipe.items.map(async (recipeItem) => {
        const stockItem = await this.skuStockItemRepo.findBySkuId(recipeItem.materialSkuId);
        if (!stockItem?.id) throw new NotFoundException("Stock item de materia prima sku no encontrado");
        return {
          mode: "sku" as const,
          stockItemId: stockItem.id,
          skuId: recipeItem.materialSkuId,
          quantity: recipeItem.quantity * quantity,
        };
      }),
    );
  }

  async resolveSkuByStockItemId(stockItemId: string) {
    const skuStockItem = await this.skuStockItemRepo.findById(stockItemId);
    if (!skuStockItem) return null;
    return this.skuRepo.findById(skuStockItem.skuId);
  }
}



