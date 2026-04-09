import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ListInventoryInput } from '../../dto/inventory/input/list-inventory';
import { InventorySnapshotOutput } from '../../dto/inventory/output/inventory-snapshot';
import { PaginatedInventorySnapshotOutput } from '../../dto/inventory/output/inventory-paginated';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';
import { InventoryOutputMapper } from '../../mappers/inventory-output.mapper';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';
import { errorResponse } from 'src/shared/response-standard/response';
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from 'src/modules/warehouses/application/ports/warehouse.repository.port';
import { WarehouseId } from 'src/modules/warehouses/domain/value-objects/warehouse-id.vo';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from 'src/modules/catalog/application/ports/product-variant.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/modules/catalog/application/ports/product.repository';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariantWithProductInfo } from 'src/modules/catalog/domain/read-models/product-variant-with-product-info.rm';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Warehouse } from 'src/modules/warehouses/domain/entities/warehouse';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';

@Injectable()
export class ListInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly productVariantRepo: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository
  ) {}

  async execute(input: ListInventoryInput): Promise<PaginatedInventorySnapshotOutput> {
    const stockItemId = input.stockItemId ?? input.itemId;
    let stockItem: StockItem;
    let resolvedStockItemId: string | undefined;
    if (stockItemId) {
      stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
      if (!stockItem) {
        throw new BadRequestException(errorResponse('Error en stockItemId'));
      }
      resolvedStockItemId = stockItem.stockItemId;
    }

    const warehouseId = input.warehouseId ?? undefined;
    let warehouse:Warehouse;
    if(warehouseId){
      warehouse = await this.warehouseRepo.findById(new WarehouseId(input.warehouseId));
    }

    const locationId = input.locationId ? input.locationId : undefined;
    const paged = await this.inventoryRepo.listSnapshots({
      warehouseId: warehouse ? warehouse.warehouseId.value : undefined,
      stockItemId: resolvedStockItemId,
      locationId,
      search: input.search,
      type: input.type,
      page: input.page,
      limit: input.limit,
    });
    const items: InventorySnapshotOutput[] = [];
    for (const snapshot of paged.items) {
      const warehouse = await this.warehouseRepo.findById(new WarehouseId(snapshot.warehouseId));
      if (!warehouse) {
        throw new BadRequestException(errorResponse('Error en warehouseId en inventario'))
      }
      const arrayStockItem = await this.stockItemRepo.findById(snapshot.stockItemId);
      if (!arrayStockItem) {
        throw new BadRequestException(errorResponse('Error en stockItemId en inventario'))
      }

      let product:Product;
      let variant:ProductVariantWithProductInfo;
      if(arrayStockItem.type === StockItemType.PRODUCT) {
        product = await this.productRepo.findById(ProductId.create(arrayStockItem.productId));
      }
      if(arrayStockItem.type === StockItemType.VARIANT) {
        variant = await this.productVariantRepo.findByIdWithProductInfo(arrayStockItem.variantId);
      }

      items.push({
        warehouseId: snapshot.warehouseId,
        warehouse,
        stockItemId: snapshot.stockItemId,
        stockItem: {
          id: arrayStockItem.stockItemId ?? '',
          type: arrayStockItem.type,
          productId: arrayStockItem.productId ?? null,
          variantId: arrayStockItem.variantId ?? null,
          product: product ?? null,
          variant: variant ?? null,
        },
        locationId: snapshot.locationId,
        onHand: snapshot.onHand,
        reserved: snapshot.reserved,
        available: snapshot.available,
      });
    }
    return InventoryOutputMapper.toPaginatedOutput({
      items,
      total: paged.total,
      page: paged.page,
      limit: paged.limit,
    });
    
  }
}
