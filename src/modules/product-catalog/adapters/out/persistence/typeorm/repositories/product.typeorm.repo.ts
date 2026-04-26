import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductCatalogProduct } from "src/modules/product-catalog/domain/entities/product";
import {
  ProductCatalogProductDetail,
  ProductCatalogProductListItem,
  ProductCatalogProductRepository,
  ProductCatalogProductSearchRule,
} from "src/modules/product-catalog/domain/ports/product.repository";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { ProductCatalogInventoryEntity } from "../entities/inventory.entity";
import { ProductCatalogProductEntity } from "../entities/product.entity";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";
import { ProductCatalogStockItemEntity } from "../entities/stock-item.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";

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

  /**
   * The function `applyNumericRule` takes a query builder, expression, search rule, and key, and
   * applies a numeric comparison rule to the query builder.
   * @param qb - The `qb` parameter is a query builder object that is used to construct SQL queries for
   * interacting with the database. In this case, it is specifically a query builder for the
   * `ProductCatalogProductEntity` repository. The `createQueryBuilder` method is used to create a new
   * query builder instance for this repository
   * @param {string} expression - The `expression` parameter in the `applyNumericRule` function
   * represents the field or property in the database table that you want to apply the numeric rule to.
   * It is used to construct the WHERE clause in the SQL query to filter records based on the numeric
   * comparison specified by the rule.
   * @param {ProductCatalogProductSearchRule} rule - The `rule` parameter in the `applyNumericRule`
   * function represents a specific search rule for filtering products in a product catalog. It
   * contains information such as the operator (e.g., EQ for equal, GT for greater than, GTE for
   * greater than or equal to, LT for less than,
   * @param {string} key - The `key` parameter in the `applyNumericRule` function is a string that
   * represents the key or property in the entity that you are filtering on. It is used to construct
   * the query condition for the numeric rule being applied.
   * @returns The `applyNumericRule` function is returning nothing (`undefined`) if the value parsed
   * from the rule is not a valid number or if the operator is not recognized.
   */
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

  /**
   * The function `applyFilters` processes a set of filters to construct dynamic query conditions for a
   * product catalog search.
   * @param qb - The `qb` parameter in the `applyFilters` function is a query builder object that is
   * used to construct SQL queries for filtering product catalog data. It is obtained from the
   * `createQueryBuilder` method of a repository that handles interactions with the
   * `ProductCatalogProductEntity` entity. This query builder is used
   * @param {ProductCatalogProductSearchRule[]} [filters] - The `applyFilters` function takes in two
   * parameters:
   */
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

  /**
   * The function `toDomain` converts a `ProductCatalogProductEntity` object to a
   * `ProductCatalogProduct` object in TypeScript.
   * @param {ProductCatalogProductEntity} row - The `row` parameter in the `toDomain` function is of
   * type `ProductCatalogProductEntity`, which seems to represent an entity from the product catalog.
   * It contains the following properties:
   * @returns A `ProductCatalogProduct` object is being returned, created using the data from the
   * `ProductCatalogProductEntity` object `row`.
   */
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

  /**
   * The function creates a new product in the product catalog and returns the saved product.
   * @param {ProductCatalogProduct} product - The `create` function is an asynchronous function that
   * takes a `ProductCatalogProduct` object as a parameter. The `ProductCatalogProduct` object
   * typically contains properties such as `name`, `description`, `type`, `brand`, `baseUnitId`, and
   * `isActive`. These properties are used to
   * @returns The `create` function is returning a Promise that resolves to a `ProductCatalogProduct`
   * object. This object represents the product that was saved in the database after creating a new
   * entry with the provided product details.
   */
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

  /* The `update` method in the `ProductCatalogProductTypeormRepository` class is responsible for
  updating a product in the product catalog. It takes two parameters: `id` of type `string` which
  represents the identifier of the product to be updated, and `patch` of type
  `Partial<Pick<ProductCatalogProduct, "name" | "description" | "type" | "brand" | "baseUnitId" |
  "isActive">>` which contains the partial data to be updated for the product. */
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

  /**
   * This TypeScript function retrieves product details and associated SKUs from a database and returns
   * them in a structured format.
   * @param {string} id - The `getDetail` function you provided is an asynchronous function that
   * retrieves product details along with inventory information based on the provided `id`. The
   * function first fetches the product entity from the repository using the `id`. If the product
   * entity is not found, it returns `null`.
   * @returns The `getDetail` function returns a `Promise` that resolves to a
   * `ProductCatalogProductDetail` object or `null`. The `ProductCatalogProductDetail` object contains
   * properties such as `id`, `name`, `description`, `type`, `brand`, `isActive`, and an array of
   * `skus` which includes details about each SKU of the product, such as SKU ID, SKU
   */
  async getDetail(id: string): Promise<ProductCatalogProductDetail | null> {
    const productEntity = await this.repo.findOne({ where: { id } });
    if (!productEntity) return null;

    const product = this.toDomain(productEntity);

    const skus = await this.repo.manager
      .getRepository(ProductCatalogSkuEntity)
      .createQueryBuilder("s")
      .leftJoin(ProductCatalogStockItemEntity, "si", "si.sku_id = s.sku_id")
      .leftJoin(ProductCatalogInventoryEntity, "i", "i.stock_item_id = si.stock_item_id")
      .leftJoin(WarehouseEntity, "w", "w.id = i.warehouse_id")
      .where("s.product_id = :id", { id })
      .select([
        "s.sku_id as id",
        "s.backend_sku as sku",
        "s.name as name",
        "i.warehouse_id as warehouse_id",
        "w.name as warehouse_name",
        "i.on_hand as on_hand",
      ])
      .getRawMany<{
        id: string;
        sku: string;
        name: string;
        warehouse_id: string | null;
        warehouse_name: string | null;
        on_hand: number | null;
      }>();

    const skusMap = new Map<string, any>();
    for (const row of skus) {
      if (!skusMap.has(row.id)) {
        skusMap.set(row.id, {
          id: row.id,
          sku: row.sku,
          name: row.name,
          inventory: [],
        });
      }

      if (row.warehouse_id) {
        skusMap.get(row.id).inventory.push({
          warehouseId: row.warehouse_id,
          warehouseName: row.warehouse_name,
          onHand: Number(row.on_hand || 0),
        });
      }
    }

    return {
      id: product.id!,
      name: product.name,
      description: product.description,
      type: product.type,
      brand: product.brand,
      isActive: product.isActive,
      skus: Array.from(skusMap.values()),
    };
  }

 
  /* The above code is a TypeScript async function that lists products based on the provided
  parameters. Here is a breakdown of what the code is doing: */
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
        const metrics = metricsMap.get(row.id) ?? {
          skuCount: 0,
          inventoryTotal: 0,
        };

        const product = this.toDomain(row);

        return {
          id: product.id!,
          name: product.name,
          description: product.description,
          skuCount: metrics.skuCount,
          inventoryTotal: metrics.inventoryTotal,
          brand: product.brand,
          baseUnitId: product.baseUnitId,
          baseUnit: row.baseUnit
            ? row.baseUnit.name
            : null,
          isActive: product.isActive,
        };  
      }),
      total,
      page,
      limit,
    };
  }
}
