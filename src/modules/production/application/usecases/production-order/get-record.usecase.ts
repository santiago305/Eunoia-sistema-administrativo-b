import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/product-catalog/integration/inventory/ports/stock-item.repository.port";
import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  ProductionOrderDetailOutput,
  ProductionOrderFinishedItemOutput,
} from "../../dto/production-order/output/production-order-detail-out";
import { ProductionOrderOutputMapper } from "../../mappers/production-order-output.mapper";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

@Injectable()
export class GetProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly productCatalogStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly productCatalogSkuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productCatalogProductRepo: ProductCatalogProductRepository,
  ) {}

  async execute(params: { productionId: string }): Promise<ProductionOrderDetailOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      if (!result) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const items = await Promise.all(
        result.items.map(async (item) => {
          const skuStockItem = await this.productCatalogStockItemRepo.findById(item.finishedItemId);
          const stockItem = skuStockItem ? null : await this.stockItemRepo.findById(item.finishedItemId, tx);
          if (!stockItem && !skuStockItem) throw new NotFoundException("No se encontro el item de stock");

          let finishedItem: ProductionOrderFinishedItemOutput | null = null;

          if (stockItem?.type === StockItemType.PRODUCT) {
            if (!stockItem.productId) {
              throw new NotFoundException("No se encontro el producto");
            }

            finishedItem = {
              type: StockItemType.PRODUCT,
              productId: stockItem.productId,
              product: {
                id: stockItem.productId,
                name: null,
                sku: null,
              },
            };
          } else if (skuStockItem) {
            const skuInfo = await this.productCatalogSkuRepo.findById(skuStockItem.skuId);
            if (!skuInfo) throw new NotFoundException("No se encontro el sku");
            const product = await this.productCatalogProductRepo.findById(skuInfo.sku.productId);
            if (!product) throw new NotFoundException("No se encontro la familia del sku");
            finishedItem = {
              type: "SKU",
              productId: product.id ?? null,
              sku: {
                id: skuInfo.sku.id!,
                productId: skuInfo.sku.productId,
                productName: product.name,
                name: skuInfo.sku.name,
                backendSku: skuInfo.sku.backendSku,
                customSku: skuInfo.sku.customSku,
                barcode: skuInfo.sku.barcode,
                price: skuInfo.sku.price,
                cost: skuInfo.sku.cost,
                isActive: skuInfo.sku.isActive,
                attributes: skuInfo.attributes,
              },
            };
          }

          return {
            ...ProductionOrderOutputMapper.toItemOutput(item, { finishedItemType: skuStockItem ? "SKU" : stockItem?.type ?? null }),
            finishedItem,
          };
        }),
      );

      const serie = result.serie
        ? {
            id: result.serie.id,
            code: result.serie.code,
            name: result.serie.name,
            docType: result.serie.docType,
            warehouseId: result.serie.warehouseId,
            nextNumber: result.serie.nextNumber,
            padding: result.serie.padding,
            separator: result.serie.separator,
            isActive: result.serie.isActive,
            createdAt: result.serie.createdAt,
          }
        : null;

      return ProductionOrderOutputMapper.toDetailOutput({
        order: result.order,
        serie,
        items,
      });
    });
  }
}



