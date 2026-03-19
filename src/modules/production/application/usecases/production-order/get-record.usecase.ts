import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { errorResponse } from "src/shared/response-standard/response";
import {
  ProductionOrderDetailOutput,
  ProductionOrderFinishedItemOutput,
} from "../../dto/production-order/output/production-order-detail-out";
import type { ProductOutput } from "src/modules/catalog/application/dto/products/output/product-out";
import type { ProductVariantOutput } from "src/modules/catalog/application/dto/product-variants/output/product-variant-out";
import type { Product } from "src/modules/catalog/domain/entity/product";
import type { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";

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
        throw new NotFoundException(errorResponse("No se encontro la orden de produccion"));
      }

      const items = await Promise.all(
        result.items.map(async (i) => {
          const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(i.finishedItemId, tx);
          if (!stockItem) {
            throw new NotFoundException(errorResponse("No se encontro el item de stock"));
          }

          let finishedItem: ProductionOrderFinishedItemOutput | null = null;

          if (stockItem.type === StockItemType.PRODUCT) {
            if (!stockItem.productId) {
              throw new NotFoundException(errorResponse("No se encontro el producto"));
            }
            const productInfo = await this.productRepo.findByIdWithUnitInfo(
              ProductId.create(stockItem.productId),
              tx,
            );
            if (!productInfo) {
              throw new NotFoundException(errorResponse("No se encontro el producto"));
            }
            finishedItem = {
              type: StockItemType.PRODUCT,
              product: this.toProductOutput(productInfo.product, {
                baseUnitName: productInfo.baseUnitName,
                baseUnitCode: productInfo.baseUnitCode,
              }),
            };
          } else if (stockItem.type === StockItemType.VARIANT) {
            if (!stockItem.variantId) {
              throw new NotFoundException(errorResponse("No se encontro la variante"));
            }
            const variantInfo = await this.variantRepo.findByIdWithProductInfo(stockItem.variantId, tx);
            if (!variantInfo?.variant) {
              throw new NotFoundException(errorResponse("No se encontro la variante"));
            }
            finishedItem = {
              type: StockItemType.VARIANT,
              variant: this.toVariantOutput(variantInfo.variant, {
                productName: variantInfo.productName,
                productDescription: variantInfo.productDescription,
                baseUnitId: variantInfo.baseUnitId,
                unitCode: variantInfo.unitCode,
                unitName: variantInfo.unitName,
              }),
            };
          }

          return {
            id: i.productionItemId!,
            productionId: i.productionId,
            finishedItemId: i.finishedItemId,
            finishedItem,
            fromLocationId: i.fromLocationId,
            toLocationId: i.toLocationId,
            quantity: i.quantity,
            unitCost: i.unitCost,
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

      return {
        id: result.order.productionId!,
        fromWarehouseId: result.order.fromWarehouseId,
        toWarehouseId: result.order.toWarehouseId,
        serieId: result.order.serieId,
        serie,
        correlative: result.order.correlative,
        status: result.order.status,
        reference: result.order.referense,
        manufactureDate: result.order.manufactureDate,
        createdAt: result.order.createdAt,
        items,
      };
    });
  }

  private toProductOutput(
    product: Product,
    info?: { baseUnitName?: string; baseUnitCode?: string },
  ): ProductOutput {
    return {
      id: product.getId()?.value!,
      name: product.getName(),
      description: product.getDescription(),
      baseUnitId: product.getBaseUnitId(),
      sku: product.getSku(),
      barcode: product.getBarcode(),
      price: product.getPrice().getAmount(),
      cost: product.getCost().getAmount(),
      attributes: product.getAttributes(),
      isActive: product.getIsActive(),
      type: product.getType(),
      createdAt: product.getCreatedAt()!,
      updatedAt: product.getUpdatedAt()!,
      baseUnitName: info?.baseUnitName,
      baseUnitCode: info?.baseUnitCode,
    };
  }

  private toVariantOutput(
    variant: ProductVariant,
    info?: {
      productName?: string;
      productDescription?: string | null;
      baseUnitId?: string;
      unitCode?: string;
      unitName?: string;
    },
  ): ProductVariantOutput {
    return {
      id: variant.getId(),
      productId: variant.getProductId().value,
      productName: info?.productName,
      productDescription: info?.productDescription ?? null,
      baseUnitId: info?.baseUnitId,
      unitCode: info?.unitCode,
      unitName: info?.unitName,
      sku: variant.getSku(),
      barcode: variant.getBarcode(),
      attributes: variant.getAttributes(),
      price: variant.getPrice().getAmount(),
      cost: variant.getCost().getAmount(),
      isActive: variant.getIsActive(),
      createdAt: variant.getCreatedAt(),
    };
  }

}
