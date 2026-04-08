import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/application/ports/product.repository";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/application/ports/product-variant.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { toProductOutput, toVariantOutput } from "src/modules/production/application/utils/productVariant";
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
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(params: { productionId: string }): Promise<ProductionOrderDetailOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      if (!result) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const items = await Promise.all(
        result.items.map(async (item) => {
          const stockItem = await this.stockItemRepo.findById(item.finishedItemId, tx);
          if (!stockItem) {
            throw new NotFoundException("No se encontro el item de stock");
          }

          let finishedItem: ProductionOrderFinishedItemOutput | null = null;

          if (stockItem.type === StockItemType.PRODUCT) {
            if (!stockItem.productId) {
              throw new NotFoundException("No se encontro el producto");
            }

            const productInfo = await this.productRepo.findByIdWithUnitInfo(
              ProductId.create(stockItem.productId),
              tx,
            );

            if (!productInfo) {
              throw new NotFoundException("No se encontro el producto");
            }

            finishedItem = {
              type: StockItemType.PRODUCT,
              productId: stockItem.productId,
              variantId: null,
              product: toProductOutput(productInfo.product, {
                baseUnitName: productInfo.baseUnitName,
                baseUnitCode: productInfo.baseUnitCode,
              }),
            };
          } else if (stockItem.type === StockItemType.VARIANT) {
            if (!stockItem.variantId) {
              throw new NotFoundException("No se encontro la variante");
            }

            const variantInfo = await this.variantRepo.findByIdWithProductInfo(stockItem.variantId, tx);
            if (!variantInfo?.variant) {
              throw new NotFoundException("No se encontro la variante");
            }

            finishedItem = {
              type: StockItemType.VARIANT,
              productId: variantInfo.variant.getProductId().value,
              variantId: stockItem.variantId,
              variant: toVariantOutput(variantInfo.variant, {
                productName: variantInfo.productName,
                productDescription: variantInfo.productDescription,
                baseUnitId: variantInfo.baseUnitId,
                unitCode: variantInfo.unitCode,
                unitName: variantInfo.unitName,
              }),
            };
          }

          return {
            ...ProductionOrderOutputMapper.toItemOutput(item, { finishedItemType: stockItem.type }),
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
