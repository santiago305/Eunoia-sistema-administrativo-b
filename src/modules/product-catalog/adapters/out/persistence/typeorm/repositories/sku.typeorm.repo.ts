import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogSku } from "src/modules/product-catalog/domain/entities/sku";
import {
  ProductCatalogSkuRepository,
  ProductCatalogSkuWithAttributes,
  SkuAttributeInput,
} from "src/modules/product-catalog/domain/ports/sku.repository";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { ProductCatalogAttributeEntity } from "../entities/attribute.entity";
import { ProductCatalogSkuAttributeValueEntity } from "../entities/sku-attribute-value.entity";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";

@Injectable()
export class ProductCatalogSkuTypeormRepository implements ProductCatalogSkuRepository {
  constructor(
    @InjectRepository(ProductCatalogSkuEntity)
    private readonly repo: Repository<ProductCatalogSkuEntity>,
    @InjectRepository(ProductCatalogAttributeEntity)
    private readonly attributeRepo: Repository<ProductCatalogAttributeEntity>,
    @InjectRepository(ProductCatalogSkuAttributeValueEntity)
    private readonly attributeValueRepo: Repository<ProductCatalogSkuAttributeValueEntity>,
  ) {}

  private toDomain(row: ProductCatalogSkuEntity): ProductCatalogSku {
    return new ProductCatalogSku(
      row.id,
      row.productId,
      row.backendSku,
      row.customSku ?? null,
      row.name,
      row.barcode ?? null,
      Number(row.price ?? 0),
      Number(row.cost ?? 0),
      row.isSellable,
      row.isPurchasable,
      row.isManufacturable,
      row.isStockTracked,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  private async ensureAttributes(
    manager: EntityManager,
    attributes: SkuAttributeInput[],
  ): Promise<Array<{ entityId: string; code: string; name: string | null; value: string }>> {
    const normalized = attributes
      .filter((attribute) => attribute.code.trim() && attribute.value.trim())
      .map((attribute) => ({
        code: attribute.code.trim().toLowerCase(),
        name: attribute.name?.trim() || attribute.code.trim(),
        value: attribute.value.trim(),
      }));

    const resolved: Array<{ entityId: string; code: string; name: string | null; value: string }> = [];
    for (const attribute of normalized) {
      let entity = await manager.getRepository(ProductCatalogAttributeEntity).findOne({
        where: { code: attribute.code },
      });
      if (!entity) {
        entity = await manager.getRepository(ProductCatalogAttributeEntity).save({
          code: attribute.code,
          name: attribute.name ?? attribute.code,
        });
      }
      resolved.push({
        entityId: entity.id,
        code: entity.code,
        name: entity.name,
        value: attribute.value,
      });
    }
    return resolved;
  }

  private async loadAttributes(
    skuIds: string[],
  ): Promise<Map<string, Array<{ code: string; name: string | null; value: string }>>> {
    if (!skuIds.length) return new Map();
    const rows = await this.attributeValueRepo
      .createQueryBuilder("sav")
      .innerJoin(ProductCatalogAttributeEntity, "a", "a.attribute_id = sav.attribute_id")
      .where("sav.sku_id IN (:...skuIds)", { skuIds })
      .select([
        "sav.sku_id AS sku_id",
        "sav.value AS value",
        "a.code AS code",
        "a.name AS name",
      ])
      .orderBy("a.code", "ASC")
      .getRawMany<{ sku_id: string; code: string; name: string | null; value: string }>();

    const map = new Map<string, Array<{ code: string; name: string | null; value: string }>>();
    for (const row of rows) {
      const list = map.get(row.sku_id) ?? [];
      list.push({ code: row.code, name: row.name, value: row.value });
      map.set(row.sku_id, list);
    }
    return map;
  }

  private async toOutput(row: ProductCatalogSkuEntity): Promise<ProductCatalogSkuWithAttributes> {
    const map = await this.loadAttributes([row.id]);
    return {
      sku: this.toDomain(row),
      unit: row.product?.baseUnit,
      attributes: map.get(row.id) ?? [],
    };
  }

  async create(input: { sku: ProductCatalogSku; attributes: SkuAttributeInput[] }): Promise<ProductCatalogSkuWithAttributes> {
    return this.repo.manager.transaction(async (manager) => {
      const saved = await manager.getRepository(ProductCatalogSkuEntity).save({
        productId: input.sku.productId,
        backendSku: input.sku.backendSku,
        customSku: input.sku.customSku,
        name: input.sku.name,
        barcode: input.sku.barcode,
        price: input.sku.price,
        cost: input.sku.cost,
        isSellable: input.sku.isSellable,
        isPurchasable: input.sku.isPurchasable,
        isManufacturable: input.sku.isManufacturable,
        isStockTracked: input.sku.isStockTracked,
        isActive: input.sku.isActive,
      });

      const attributes = await this.ensureAttributes(manager, input.attributes);
      if (attributes.length) {
        await manager.getRepository(ProductCatalogSkuAttributeValueEntity).save(
          attributes.map((attribute) => ({
            skuId: saved.id,
            attributeId: attribute.entityId,
            value: attribute.value,
          })),
        );
      }

      return {
        sku: this.toDomain(saved),
        attributes: attributes.map((attribute) => ({
          code: attribute.code,
          name: attribute.name,
          value: attribute.value,
        })),
      };
    });
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        ProductCatalogSku,
        "name" | "barcode" | "price" | "cost" | "customSku" | "isSellable" | "isPurchasable" | "isManufacturable" | "isStockTracked" | "isActive"
      >
    > & { attributes?: SkuAttributeInput[] },
  ): Promise<ProductCatalogSkuWithAttributes | null> {
    return this.repo.manager.transaction(async (manager) => {
      const skuRepo = manager.getRepository(ProductCatalogSkuEntity);
      const existing = await skuRepo.findOne({ where: { id } });
      if (!existing) return null;

      const scalarPatch = { ...patch };
      delete (scalarPatch as { attributes?: SkuAttributeInput[] }).attributes;
      if (Object.keys(scalarPatch).length) {
        await skuRepo.update({ id }, scalarPatch);
      }

      if (patch.attributes) {
        await manager.getRepository(ProductCatalogSkuAttributeValueEntity).delete({ skuId: id });
        const attributes = await this.ensureAttributes(manager, patch.attributes);
        if (attributes.length) {
          await manager.getRepository(ProductCatalogSkuAttributeValueEntity).save(
            attributes.map((attribute) => ({
              skuId: id,
              attributeId: attribute.entityId,
              value: attribute.value,
            })),
          );
        }
      }

      const updated = await skuRepo.findOne({ where: { id } });
      if (!updated) return null;
      return this.toOutput(updated);
    });
  }

  async findById(id: string): Promise<ProductCatalogSkuWithAttributes | null> {
    const row = await this.repo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.product", "p")
      .leftJoinAndSelect("p.baseUnit", "bu")
      .where("s.id = :id", { id })
      .getOne();
    return row ? this.toOutput(row) : null;
  }

  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    isActive?: boolean;
    skuId?: string;
    productId?: string;
    productType?: ProductCatalogProductType;
    warehouseId?: string;
  }): Promise<{ items: ProductCatalogSkuWithAttributes[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.product", "p")
      .leftJoinAndSelect("p.baseUnit", "bu");

    if (params.productType) {
      qb.andWhere("p.type = :productType", {
        productType: params.productType,
      });
    }

    if (params.skuId) {
      qb.andWhere("s.sku_id = :skuId", { skuId: params.skuId });
    }

    if (params.productId) {
      qb.andWhere("s.product_id = :productId", {
        productId: params.productId,
      });
    }

    if (params.isActive !== undefined) {
      qb.andWhere("s.is_active = :isActive", {
        isActive: params.isActive,
      });
    }

    if (params.warehouseId) {
      const warehouseQuery = params.warehouseId.trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(warehouseQuery);

      if (isUuid) {
        qb.andWhere(
          `EXISTS (
            SELECT 1
            FROM pc_stock_items si
            INNER JOIN pc_inventory i ON i.stock_item_id = si.stock_item_id
            INNER JOIN warehouses w ON w.id = i.warehouse_id
            WHERE si.sku_id = s.sku_id
              AND w.id = :warehouseId
          )`,
          { warehouseId: warehouseQuery },
        );
      } else {
        const warehouseName = warehouseQuery.toLowerCase();
        qb.andWhere(
          `EXISTS (
            SELECT 1
            FROM pc_stock_items si
            INNER JOIN pc_inventory i ON i.stock_item_id = si.stock_item_id
            INNER JOIN warehouses w ON w.id = i.warehouse_id
            WHERE si.sku_id = s.sku_id
              AND LOWER(w.name) LIKE :warehouseName
          )`,
          { warehouseName: `%${warehouseName}%` },
        );
      }
    }

    if (params.q?.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;

      qb.andWhere(
        `(
          LOWER(s.name) LIKE :q
          OR LOWER(s.backend_sku) LIKE :q
          OR LOWER(COALESCE(s.custom_sku, '')) LIKE :q
          OR LOWER(COALESCE(s.barcode, '')) LIKE :q
          OR EXISTS (
            SELECT 1
            FROM pc_sku_attribute_values sav
            INNER JOIN pc_attributes a ON a.attribute_id = sav.attribute_id
            WHERE sav.sku_id = s.sku_id
              AND (
                LOWER(a.code) LIKE :q
                OR LOWER(COALESCE(a.name, '')) LIKE :q
                OR LOWER(sav.value) LIKE :q
              )
          )
        )`,
        { q },
      );
    }

    const shouldPaginate = params.page !== undefined || params.limit !== undefined;
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;

    if (shouldPaginate) {
      qb.skip((page - 1) * limit).take(limit);
    }

    const [rows, total] = await qb.orderBy("s.createdAt", "DESC").getManyAndCount();

    const attributes = await this.loadAttributes(rows.map((row) => row.id));

    return {
      items: rows.map((row) => ({
        sku: this.toDomain(row),
        unit: row.product?.baseUnit,
        attributes: attributes.get(row.id) ?? [],
      })),
      total,
    };
  }

<<<<<<< Updated upstream
  if (params.productId) {
    qb.andWhere("s.product_id = :productId", {
      productId: params.productId,
    });
  }

  if (params.isActive !== undefined) {
    qb.andWhere("s.is_active = :isActive", {
      isActive: params.isActive,
    });
  }

  if (params.q?.trim()) {
    const q = `%${params.q.trim().toLowerCase()}%`;

    qb.andWhere(
      `
      (
        LOWER(p.name) LIKE :q
        OR LOWER(COALESCE(p.description, '')) LIKE :q
        OR LOWER(COALESCE(p.brand, '')) LIKE :q
        OR LOWER(s.name) LIKE :q
        OR LOWER(s.backend_sku) LIKE :q
        OR LOWER(COALESCE(s.custom_sku, '')) LIKE :q
        OR LOWER(COALESCE(s.barcode, '')) LIKE :q
      )
      `,
      { q },
    );
  }

  const page = params.page > 0 ? params.page : 1;
  const limit = params.limit > 0 ? params.limit : 10;

  const [rows, total] = await qb
    .orderBy("s.createdAt", "DESC")
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  const attributes = await this.loadAttributes(rows.map((row) => row.id));

  return {
    items: rows.map((row) => ({
      sku: this.toDomain(row),
      unit: row.product.baseUnit,
      attributes: attributes.get(row.id) ?? [],
    })),
    total,
  };
}

=======
>>>>>>> Stashed changes
  async findByProductId(productId: string): Promise<ProductCatalogSkuWithAttributes[]> {
    const rows = await this.repo.find({
      where: { productId },
      order: { createdAt: "DESC" },
    });
    const attributes = await this.loadAttributes(rows.map((row) => row.id));
    return rows.map((row) => ({
      sku: this.toDomain(row),
      attributes: attributes.get(row.id) ?? [],
    }));
  }

  async reserveNextBackendSku(): Promise<string> {
    const row = await this.repo
      .createQueryBuilder("s")
      .select("MAX(CAST(s.backend_sku AS integer))", "max")
      .where("s.backend_sku ~ '^[0-9]+$'")
      .getRawOne<{ max: string | null }>();

    const next = (row?.max ? Number(row.max) : 0) + 1;
    return String(next).padStart(5, "0");
  }
}
