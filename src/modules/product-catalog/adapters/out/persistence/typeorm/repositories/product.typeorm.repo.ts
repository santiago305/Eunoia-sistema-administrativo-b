import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductCatalogProduct } from "src/modules/product-catalog/domain/entities/product";
import {
  ProductCatalogProductListItem,
  ProductCatalogProductRepository,
  ProductCatalogProductSearchRule,
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

  private escapeLike(value: string) {
    return value.replace(/[%_\\]/g, "\\$&");
  }

  private normalizeTextValue(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed.toLowerCase() : undefined;
  }

  private applyTextRule(
    qb: ReturnType<Repository<ProductCatalogProductEntity>["createQueryBuilder"]>,
    column: string,
    rule: ProductCatalogProductSearchRule,
    key: string,
  ) {
    const value = this.normalizeTextValue(rule.value);
    if (!value) return;

    if (rule.operator === "EQ") {
      qb.andWhere(`LOWER(COALESCE(${column}, '')) = :${key}`, { [key]: value });
      return;
    }

    if (rule.operator === "CONTAINS") {
      qb.andWhere(`LOWER(COALESCE(${column}, '')) LIKE :${key} ESCAPE '\\'`, {
        [key]: `%${this.escapeLike(value)}%`,
      });
    }
  }

  private applyNumericRule(
    qb: ReturnType<Repository<ProductCatalogProductEntity>["createQueryBuilder"]>,
    expression: string,
    rule: ProductCatalogProductSearchRule,
    key: string,
  ) {
    const value = Number(rule.value);
    if (Number.isNaN(value)) return;

    const operator =
      rule.operator === "EQ" ? "=" :
      rule.operator === "GT" ? ">" :
      rule.operator === "GTE" ? ">=" :
      rule.operator === "LT" ? "<" :
      rule.operator === "LTE" ? "<=" :
      null;

    if (!operator) return;
    qb.andWhere(`${expression} ${operator} :${key}`, { [key]: value });
  }

  private applyFilters(
    qb: ReturnType<Repository<ProductCatalogProductEntity>["createQueryBuilder"]>,
    filters?: ProductCatalogProductSearchRule[],
  ) {
    (filters ?? []).forEach((rule, index) => {
      const key = `filter_${rule.field}_${index}`;

      if (rule.field === "status" && rule.operator === "IN") {
        const values = Array.from(new Set((rule.values ?? []).map((value) => value?.trim()).filter(Boolean)));
        if (!values.length) return;
        const normalized = values.map((value) => value === "true");
        const condition =
          rule.mode === "exclude"
            ? "p.is_active NOT IN (:...statuses)"
            : "p.is_active IN (:...statuses)";
        qb.andWhere(condition, { statuses: normalized });
        return;
      }

      if (rule.field === "name") {
        this.applyTextRule(qb, "p.name", rule, key);
        return;
      }

      if (rule.field === "description") {
        this.applyTextRule(qb, "p.description", rule, key);
        return;
      }

      if (rule.field === "brand") {
        this.applyTextRule(qb, "p.brand", rule, key);
        return;
      }

      if (rule.field === "skuCount") {
        this.applyNumericRule(
          qb,
          `(SELECT COUNT(DISTINCT s2.sku_id) FROM pc_skus s2 WHERE s2.product_id = p.product_id)`,
          rule,
          key,
        );
        return;
      }

      if (rule.field === "inventoryTotal") {
        this.applyNumericRule(
          qb,
          `(
            SELECT COALESCE(SUM(i2.on_hand), 0)
            FROM pc_skus s2
            LEFT JOIN pc_stock_items si2 ON si2.sku_id = s2.sku_id
            LEFT JOIN pc_inventory i2 ON i2.stock_item_id = si2.stock_item_id
            WHERE s2.product_id = p.product_id
          )`,
          rule,
          key,
        );
      }
    });
  }

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
    filters?: ProductCatalogProductSearchRule[];
  }): Promise<{ items: ProductCatalogProductListItem[]; total: number; page: number; limit: number }> {
    const qb = this.repo.createQueryBuilder("p").leftJoinAndSelect("p.baseUnit", "bu");
    if (params.type) {
      qb.andWhere("p.type = :type", { type: params.type });
    }
    if (params.isActive !== undefined) {
      qb.andWhere("p.is_active = :isActive", { isActive: params.isActive });
    }
    if (params.q?.trim()) {
      qb.andWhere("(LOWER(p.name) LIKE :q OR LOWER(COALESCE(p.description, '')) LIKE :q OR LOWER(COALESCE(p.brand, '')) LIKE :q)", {
        q: `%${params.q.trim().toLowerCase()}%`,
      });
    }
    this.applyFilters(qb, params.filters);

    const page = params.page > 0 ? params.page : 1;
    const limit = params.limit > 0 ? params.limit : 10;
    const [rows, total] = await qb
      .orderBy("p.createdAt", "DESC")
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
          baseUnit: row.baseUnit
            ? { id: row.baseUnit.id, code: row.baseUnit.code, name: row.baseUnit.name }
            : null,
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
