import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ProductionFilterOptionsRepository,
  ProductionProductFilterOption,
  ProductionUserFilterOption,
  ProductionWarehouseFilterOption,
} from "src/modules/production/application/ports/production-filter-options.repository";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

type ProductFilterOptionRow = {
  sku_id: string;
  sku_name: string;
  product_id: string;
  product_name: string | null;
  backend_sku: string;
  custom_sku: string | null;
  sku_active: boolean;
  stock_item_id: string | null;
  stock_item_active: boolean | null;
};

@Injectable()
export class ProductionFilterOptionsTypeormRepository implements ProductionFilterOptionsRepository {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(ProductCatalogSkuEntity)
    private readonly skuRepo: Repository<ProductCatalogSkuEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getOptions(): Promise<{
    warehouses: ProductionWarehouseFilterOption[];
    products: ProductionProductFilterOption[];
    users: ProductionUserFilterOption[];
  }> {
    const [warehouses, productRows, users] = await Promise.all([
      this.warehouseRepo
        .createQueryBuilder("w")
        .orderBy("w.isActive", "DESC")
        .addOrderBy("w.name", "ASC")
        .getMany(),
      this.skuRepo
        .createQueryBuilder("s")
        .leftJoin("s.product", "p")
        .leftJoin(ProductCatalogStockItemEntity, "si", "si.sku_id = s.sku_id")
        .select([
          "s.sku_id AS sku_id",
          "s.name AS sku_name",
          "s.product_id AS product_id",
          "p.name AS product_name",
          "s.backend_sku AS backend_sku",
          "s.custom_sku AS custom_sku",
          "s.is_active AS sku_active",
          "si.stock_item_id AS stock_item_id",
          "si.is_active AS stock_item_active",
        ])
        .orderBy("s.isActive", "DESC")
        .addOrderBy("s.customSku", "ASC")
        .addOrderBy("s.backendSku", "ASC")
        .getRawMany<ProductFilterOptionRow>(),
      this.userRepo
        .createQueryBuilder("u")
        .where("u.deleted = :deleted", { deleted: false })
        .orderBy("u.name", "ASC")
        .getMany(),
    ]);

    return {
      warehouses: warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
        active: warehouse.isActive,
      })),
      products: productRows.map((row) => {
        const sku = row.custom_sku ?? row.backend_sku;

        return {
          value: row.sku_id,
          label: `${sku} - ${row.sku_name}`,
          active: Boolean(row.sku_active) && (row.stock_item_active === null ? true : Boolean(row.stock_item_active)),
          sku,
          skuId: row.sku_id,
          stockItemId: row.stock_item_id,
          backendSku: row.backend_sku,
          customSku: row.custom_sku,
          name: row.sku_name,
          productId: row.product_id,
          productName: row.product_name ?? row.sku_name,
          hasStockItem: Boolean(row.stock_item_id),
        };
      }),
      users: users.map((user) => ({
        value: user.id,
        label: user.name,
        active: !user.deleted,
      })),
    };
  }
}
