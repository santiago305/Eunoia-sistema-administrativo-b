import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductCatalogProduct } from "src/modules/product-catalog/domain/entities/product";
import {
  ProductCatalogProductListItem,
  ProductCatalogProductRepository,
} from "src/modules/product-catalog/domain/ports/product.repository";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { ProductCatalogInventoryEntity } from "../entities/inventory.entity";
import { ProductCatalogProductEntity } from "../entities/product.entity";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";
import { ProductCatalogStockItemEntity } from "../entities/stock-item.entity";

@Injectable()
export class ProductCatalogProductTypeormRepository implements ProductCatalogProductRepository {
  constructor(
    @InjectRepository(ProductCatalogProductEntity)
    private readonly repo: Repository<ProductCatalogProductEntity>,
  ) {}

  private toDomain(row: ProductCatalogProductEntity): ProductCatalogProduct {
    return new ProductCatalogProduct(
      row.id,
      row.name,
      row.description ?? null,
      row.type,
      row.brand ?? null,
      row.baseUnitId ?? null,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  async create(product: ProductCatalogProduct): Promise<ProductCatalogProduct> {
    const saved = await this.repo.save({
      name: product.name,
      description: product.description,
      type: product.type,
      brand: product.brand,
      baseUnitId: product.baseUnitId,
      isActive: product.isActive,
    });
    return this.toDomain(saved);
  }

  async update(
    id: string,
    patch: Partial<Pick<ProductCatalogProduct, "name" | "description" | "type" | "brand" | "baseUnitId" | "isActive">>,
  ): Promise<ProductCatalogProduct | null> {
    await this.repo.update({ id }, patch);
    const updated = await this.repo.findOne({ where: { id } });
    return updated ? this.toDomain(updated) : null;
  }

  async findById(id: string): Promise<ProductCatalogProduct | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(params: {
    page: number;
    limit: number;
    q?: string;
    isActive?: boolean;
    type?: ProductCatalogProductType;
  }): Promise<{ items: ProductCatalogProductListItem[]; total: number; page: number; limit: number }> {
    const qb = this.repo.createQueryBuilder("p");
    if (params.type) {
      qb.andWhere("p.type = :type", { type: params.type });
    }
    if (params.isActive !== undefined) {
      qb.andWhere("p.is_active = :isActive", { isActive: params.isActive });
    }
    if (params.q?.trim()) {
      qb.andWhere("(LOWER(p.name) LIKE :q OR LOWER(COALESCE(p.description, '')) LIKE :q)", {
        q: `%${params.q.trim().toLowerCase()}%`,
      });
    }

    const page = params.page > 0 ? params.page : 1;
    const limit = params.limit > 0 ? params.limit : 10;
    const [rows, total] = await qb
      .orderBy("p.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const productIds = rows.map((row) => row.id);
    const metricsRows = productIds.length
      ? await this.repo.manager
          .getRepository(ProductCatalogSkuEntity)
          .createQueryBuilder("s")
          .leftJoin(ProductCatalogStockItemEntity, "si", "si.sku_id = s.sku_id")
          .leftJoin(ProductCatalogInventoryEntity, "i", "i.stock_item_id = si.stock_item_id")
          .where("s.product_id IN (:...productIds)", { productIds })
          .select([
            "s.product_id AS product_id",
            "COUNT(DISTINCT s.sku_id) AS sku_count",
            "COALESCE(SUM(i.on_hand), 0) AS inventory_total",
          ])
          .groupBy("s.product_id")
          .getRawMany<{
            product_id: string;
            sku_count: string;
            inventory_total: string;
          }>()
      : [];

    const metricsMap = new Map<string, { skuCount: number; inventoryTotal: number }>();
    for (const row of metricsRows) {
      metricsMap.set(row.product_id, {
        skuCount: Number(row.sku_count),
        inventoryTotal: Number(row.inventory_total),
      });
    }

    return {
      items: rows.map((row) => {
        const metrics = metricsMap.get(row.id) ?? { skuCount: 0, inventoryTotal: 0 };
        const product = this.toDomain(row);
        return {
          id: product.id!,
          name: product.name,
          description: product.description,
          type: product.type,
          skuCount: metrics.skuCount,
          inventoryTotal: metrics.inventoryTotal,
          brand: product.brand,
          baseUnitId: product.baseUnitId,
          isActive: product.isActive,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      }),
      total,
      page,
      limit,
    };
  }
}
