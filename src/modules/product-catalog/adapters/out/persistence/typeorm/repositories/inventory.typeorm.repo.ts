import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogInventoryBalance } from "src/modules/product-catalog/domain/entities/inventory-balance";
import {
  ProductCatalogInventoryRepository,
  ProductCatalogInventorySearchRule,
  ProductCatalogInventorySnapshotSearchRow,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import { ProductCatalogInventoryEntity } from "../entities/inventory.entity";
import { ProductCatalogStockItemEntity } from "../entities/stock-item.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";
import { ProductCatalogProductEntity } from "../entities/product.entity";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

@Injectable()
export class ProductCatalogInventoryTypeormRepository implements ProductCatalogInventoryRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryEntity)
    private readonly repo: Repository<ProductCatalogInventoryEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogInventoryEntity);
  }

  private toDomain(row: ProductCatalogInventoryEntity): ProductCatalogInventoryBalance {
    return new ProductCatalogInventoryBalance(
      row.warehouseId,
      row.stockItemId,
      row.locationId ?? null,
      row.onHand,
      row.reserved,
      row.available ?? row.onHand - row.reserved,
      row.updatedAt,
    );
  }

  private applyNumericFilter(
    qb: ReturnType<Repository<ProductCatalogInventoryEntity>["createQueryBuilder"]>,
    column: string,
    rule: ProductCatalogInventorySearchRule,
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
    qb.andWhere(`${column} ${operator} :${key}`, { [key]: value });
  }

  private applySearchFilters(
    qb: ReturnType<Repository<ProductCatalogInventoryEntity>["createQueryBuilder"]>,
    filters?: ProductCatalogInventorySearchRule[],
  ) {
    (filters ?? []).forEach((rule, index) => {
      const key = `inventory_filter_${rule.field}_${index}`;

      if (rule.field === "warehouse" && rule.operator === "IN") {
        const values = Array.from(new Set((rule.values ?? []).map((value) => value?.trim()).filter(Boolean)));
        if (!values.length) return;
        const condition =
          rule.mode === "exclude"
            ? "i.warehouse_id NOT IN (:...warehouseFilterIds)"
            : "i.warehouse_id IN (:...warehouseFilterIds)";
        qb.andWhere(condition, { warehouseFilterIds: values });
        return;
      }

      if (rule.field === "onHand") {
        this.applyNumericFilter(qb, "i.on_hand", rule, key);
        return;
      }

      if (rule.field === "reserved") {
        this.applyNumericFilter(qb, "i.reserved", rule, key);
        return;
      }

      if (rule.field === "available") {
        this.applyNumericFilter(qb, "COALESCE(i.available, i.on_hand - i.reserved)", rule, key);
      }
    });
  }

  async getSnapshot(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance | null> {
    const row = await this.getRepo(tx).findOne({
      where: {
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
      },
    });
    if (!row) return null;
    if ((row.locationId ?? null) !== (input.locationId ?? null) && input.locationId !== undefined) {
      return null;
    }
    return this.toDomain(row);
  }

  async listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]> {
    const rows = await this.getRepo(tx).find({
      where: { stockItemId },
      order: { updatedAt: "DESC" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async listBySkuId(skuId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("i")
      .innerJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = i.stock_item_id")
      .where("si.sku_id = :skuId", { skuId })
      .select([
        "i.warehouse_id AS warehouse_id",
        "i.stock_item_id AS stock_item_id",
        "i.location_id AS location_id",
        "i.on_hand AS on_hand",
        "i.reserved AS reserved",
        "i.available AS available",
        "i.updated_at AS updated_at",
      ])
      .orderBy("i.updated_at", "DESC")
      .getRawMany<{
        warehouse_id: string;
        stock_item_id: string;
        location_id: string | null;
        on_hand: number;
        reserved: number;
        available: number | null;
        updated_at: Date;
      }>();

    return rows.map(
      (row) =>
        new ProductCatalogInventoryBalance(
          row.warehouse_id,
          row.stock_item_id,
          row.location_id,
          Number(row.on_hand),
          Number(row.reserved),
          row.available !== null ? Number(row.available) : Number(row.on_hand) - Number(row.reserved),
          row.updated_at,
        ),
    );
  }
  async list(input?: {
    warehouseId?: string;
    stockItemId?: string;
    locationId?: string | null;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]> {
    const qb = this.getRepo(tx).createQueryBuilder("i");

    if (input?.warehouseId) {
      const warehouseQuery = input.warehouseId.trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(warehouseQuery);

      qb.innerJoin("warehouses", "w", "w.id = i.warehouse_id");
      if (isUuid) {
        qb.andWhere("w.id = :warehouseId", { warehouseId: warehouseQuery });
      } else {
        qb.andWhere("LOWER(w.name) LIKE :warehouseName", {
          warehouseName: `%${warehouseQuery.toLowerCase()}%`,
        });
      }
    }

    if (input?.stockItemId) {
      qb.andWhere("i.stock_item_id = :stockItemId", { stockItemId: input.stockItemId });
    }

    if (input?.locationId !== undefined) {
      if (input.locationId === null) {
        qb.andWhere("i.location_id IS NULL");
      } else {
        qb.andWhere("i.location_id = :locationId", { locationId: input.locationId });
      }
    }

    const rows = await qb.orderBy("i.updated_at", "DESC").getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async searchSnapshots(
    input: {
      warehouseId?: string;
      warehouseIdsIn?: string[];
      warehouseIdsNotIn?: string[];
      q?: string;
      isActive?: boolean;
      skuId?: string;
      skuIdsIn?: string[];
      skuIdsNotIn?: string[];
      productType?: ProductCatalogProductType;
      filters?: ProductCatalogInventorySearchRule[];
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ProductCatalogInventorySnapshotSearchRow[]; total: number }> {
    const shouldPaginate = input.page !== undefined || input.limit !== undefined;
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const baseQb = this.getRepo(tx)
      .createQueryBuilder("i")
      .innerJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = i.stock_item_id")
      .innerJoin(ProductCatalogSkuEntity, "s", "s.sku_id = si.sku_id")
      .innerJoin(ProductCatalogProductEntity, "p", "p.product_id = s.product_id")
      .innerJoin("warehouses", "w", "w.id = i.warehouse_id");

    const skuIdsIn = Array.from(new Set([...(input.skuIdsIn ?? []), ...(input.skuId ? [input.skuId] : [])]));
    if (skuIdsIn.length) {
      baseQb.andWhere("s.sku_id IN (:...skuIdsIn)", { skuIdsIn });
    }

    if (input.skuIdsNotIn?.length) {
      baseQb.andWhere("s.sku_id NOT IN (:...skuIdsNotIn)", { skuIdsNotIn: input.skuIdsNotIn });
    }

    if (input.warehouseIdsIn?.length) {
      baseQb.andWhere("i.warehouse_id IN (:...warehouseIdsIn)", { warehouseIdsIn: input.warehouseIdsIn });
    }

    if (input.warehouseIdsNotIn?.length) {
      baseQb.andWhere("i.warehouse_id NOT IN (:...warehouseIdsNotIn)", { warehouseIdsNotIn: input.warehouseIdsNotIn });
    }

    if (input.productType) {
      baseQb.andWhere("p.type = :productType", { productType: input.productType });
    }

    if (input.isActive !== undefined) {
      baseQb.andWhere("s.is_active = :isActive", { isActive: input.isActive });
    }

    if (input.warehouseId?.trim()) {
      const warehouseQuery = input.warehouseId.trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(warehouseQuery);

      if (isUuid) {
        baseQb.andWhere("w.id = :warehouseId", { warehouseId: warehouseQuery });
      } else {
        baseQb.andWhere("LOWER(w.name) LIKE :warehouseName", {
          warehouseName: `%${warehouseQuery.toLowerCase()}%`,
        });
      }
    }

    if (input.q?.trim()) {
      const q = `%${input.q.trim().toLowerCase()}%`;
      baseQb.andWhere(
        `(
          LOWER(s.name) LIKE :q
          OR LOWER(s.backend_sku) LIKE :q
          OR LOWER(COALESCE(s.custom_sku, '')) LIKE :q
          OR LOWER(COALESCE(s.barcode, '')) LIKE :q
          OR LOWER(w.name) LIKE :q
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

    this.applySearchFilters(baseQb, input.filters);

    const countQb = baseQb.clone();
    const total = await countQb.getCount();

    const dataQb = baseQb
      .select("i.warehouse_id", "warehouseId")
      .addSelect("w.name", "warehouseName")
      .addSelect("i.stock_item_id", "stockItemId")
      .addSelect("si.sku_id", "skuId")
      .addSelect("i.location_id", "locationId")
      .addSelect("i.on_hand", "onHand")
      .addSelect("i.reserved", "reserved")
      .addSelect("i.available", "available")
      .addSelect("i.updated_at", "updatedAt")
      .orderBy("i.updated_at", "DESC");

    if (shouldPaginate) {
      dataQb.skip((page - 1) * limit).take(limit);
    }

    const rows = await dataQb.getRawMany<{
      warehouseId: string;
      warehouseName: string;
      stockItemId: string;
      skuId: string;
      locationId: string | null;
      onHand: number | string;
      reserved: number | string;
      available: number | string | null;
      updatedAt: Date;
    }>();

    return {
      items: rows.map((row) => ({
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName,
        stockItemId: row.stockItemId,
        skuId: row.skuId,
        locationId: row.locationId ?? null,
        onHand: Number(row.onHand ?? 0),
        reserved: Number(row.reserved ?? 0),
        available:
          row.available !== null && row.available !== undefined
            ? Number(row.available)
            : Number(row.onHand ?? 0) - Number(row.reserved ?? 0),
        updatedAt: row.updatedAt,
      })),
      total,
    };
  }

  async upsert(input: ProductCatalogInventoryBalance, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance> {
    await this.getRepo(tx).save({
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      onHand: input.onHand,
      reserved: input.reserved,
      available: input.available,
    });

    const saved = await this.getRepo(tx).findOneOrFail({
      where: {
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
      },
    });
    return this.toDomain(saved);
  }

  async incrementReserved(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
    delta: number;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance> {
    const current =
      (await this.getSnapshot({
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
        locationId: input.locationId ?? null,
      }, tx)) ??
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        0,
        0,
        0,
      );

    const reserved = current.reserved + input.delta;
    const onHand = current.onHand;
    return this.upsert(
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        onHand,
        reserved,
        onHand - reserved,
      ),
      tx,
    );
  }

  async incrementOnHand(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
    delta: number;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance> {
    const current =
      (await this.getSnapshot({
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
        locationId: input.locationId ?? null,
      }, tx)) ??
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        0,
        0,
        0,
      );

    const onHand = current.onHand + input.delta;
    return this.upsert(
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        onHand,
        current.reserved,
        onHand - current.reserved,
      ),
      tx,
    );
  }
}
