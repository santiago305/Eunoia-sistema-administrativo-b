import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ProductCatalogInventoryEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogProductEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { WarehouseLocationEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";

type WarehouseStockRow = {
  sku_id: string;
  sku_name: string;
  product_name: string;
  on_hand: string | number;
  location_code: string | null;
};

@Injectable()
export class GetWarehouseStockUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: { warehouseId: WarehouseId }) {
    const warehouse = await this.warehouseRepo.findById(input.warehouseId);
    if (!warehouse) {
      throw new BadRequestException("Almacen no encontrado");
    }

    const rows = await this.dataSource
      .getRepository(ProductCatalogInventoryEntity)
      .createQueryBuilder("i")
      .innerJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = i.stock_item_id")
      .innerJoin(ProductCatalogSkuEntity, "sku", "sku.sku_id = si.sku_id")
      .innerJoin(ProductCatalogProductEntity, "p", "p.product_id = sku.product_id")
      .leftJoin(WarehouseLocationEntity, "loc", "loc.id = i.location_id")
      .where("i.warehouse_id = :warehouseId", { warehouseId: input.warehouseId.value })
      .andWhere("i.on_hand > 0")
      .select([
        "sku.sku_id AS sku_id",
        "sku.name AS sku_name",
        "p.name AS product_name",
        "i.on_hand AS on_hand",
        "loc.code AS location_code",
      ])
      .orderBy("sku.name", "ASC")
      .getRawMany<WarehouseStockRow>();

    const items = rows.map((row) => ({
      skuId: row.sku_id,
      skuName: row.sku_name,
      productName: row.product_name,
      onHand: Number(row.on_hand),
      locationCodes: row.location_code ? [row.location_code] : [],
    }));

    return {
      warehouseId: warehouse.warehouseId.value,
      warehouseName: warehouse.name,
      totalSkus: items.length,
      totalOnHand: items.reduce((total, item) => total + item.onHand, 0),
      items,
    };
  }
}
