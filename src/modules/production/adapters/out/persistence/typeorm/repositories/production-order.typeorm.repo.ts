import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, Repository } from "typeorm";
import { ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { ProductionOrderEntity } from "../entities/production_order.entity";
import { ProductionOrderItemEntity } from "../entities/production_order_item.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { ProductCatalogDocumentSerieEntity as DocumentSerie } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/document-serie.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogProductEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/product.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import {
  ProductionOrderListItemRM,
  ProductionOrderListSerieRM,
  ProductionOrderListWarehouseRM,
} from "src/modules/production/domain/read-models/production-order-list-item.rm";
import { DocTypeMapper } from "../mappers/doc-type.mapper";
import {
  matchSearchOptionIds,
  PRODUCTION_STATUS_SEARCH_OPTIONS,
  sanitizeProductionSearchFilters,
} from "src/modules/production/application/support/production-search.utils";
import {
  ProductionSearchFields,
  ProductionSearchOperators,
  ProductionSearchRule,
} from "src/modules/production/application/dto/production-search/production-search-snapshot";

@Injectable()
export class ProductionOrderTypeormRepository implements ProductionOrderRepository {
  constructor(
    @InjectRepository(ProductionOrderEntity)
    private readonly orderRepo: Repository<ProductionOrderEntity>,
    @InjectRepository(ProductionOrderItemEntity)
    private readonly itemRepo: Repository<ProductionOrderItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.orderRepo.manager;
  }

  private getOrderRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductionOrderEntity);
  }

  private getItemRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductionOrderItemEntity);
  }

  async findItemById(productionId: string, itemId: string, tx?: TransactionContext): Promise<ProductionOrderItem | null> {
  const repo = this.getItemRepo(tx);
  const row = await repo.findOne({ where: { id: itemId, productionId } });
  if (!row) return null;

  return new ProductionOrderItem(
    row.id,
    row.productionId,
    row.finishedItemId,
    row.fromLocationId,
    row.toLocationId,
    row.quantity,
    row.wasteQty ?? 0,
    row.unitCost,
  );
}


  async create(order: ProductionOrder, tx?: TransactionContext): Promise<ProductionOrder> {
    const repo = this.getOrderRepo(tx);
    const saved = await repo.save({
      fromWarehouseId: order.fromWarehouseId,
      toWarehouseId: order.toWarehouseId,
      docType: order.docType,
      serieId: order.serieId,
      correlative: order.correlative,
      status: order.status,
      reference: order.reference,
      manufactureDate: order.manufactureDate,
      createdBy: order.createdBy,
      updatedBy: order.updatedBy ?? null,
      imageProdution: order.imageProdution ?? [],
    });

    return new ProductionOrder(
      saved.id,
      saved.fromWarehouseId,
      saved.toWarehouseId,
      saved.docType,
      saved.serieId,
      saved.correlative,
      saved.status as ProductionStatus,
      saved.manufactureDate,
      saved.createdBy,
      saved.createdAt,
      saved.reference ?? null,
      saved.updatedAt ?? null,
      saved.updatedBy ?? null,
      saved.imageProdution ?? [],
    );
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductionOrder | null> {
    const repo = this.getOrderRepo(tx);
    const row = await repo.findOne({ where: { id } });
    if (!row) return null;

    return new ProductionOrder(
      row.id,
      row.fromWarehouseId,
      row.toWarehouseId,
      row.docType,
      row.serieId,
      row.correlative,
      row.status as ProductionStatus,
      row.manufactureDate,
      row.createdBy,
      row.createdAt,
      row.reference?? null,
      row.updatedAt?? null,
      row.updatedBy ?? null,
      row.imageProdution ?? [],
    );
  }

  async listAllByStatus(status: ProductionStatus, tx?: TransactionContext): Promise<ProductionOrder[]> {
    const repo = this.getOrderRepo(tx);
    const rows = await repo.find({ where: { status }, order: { createdAt: "DESC" } });
    return rows.map(
      (row) =>
        new ProductionOrder(
          row.id,
          row.fromWarehouseId,
          row.toWarehouseId,
          row.docType,
          row.serieId,
          row.correlative,
          row.status as ProductionStatus,
          row.manufactureDate,
          row.createdBy,
          row.createdAt,
          row.reference ?? null,
          row.updatedAt ?? null,
          row.updatedBy ?? null,
          row.imageProdution ?? [],
        ),
    );
  }

  async list(
    params: {
      filters?: ProductionSearchRule[];
      q?: string;
      status?: ProductionStatus;
      warehouseId?: string;
      skuId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: ProductionOrderListItemRM[];
    total: number;
    page: number;
    limit: number;
  }> {
    const numberExpression = `concat(coalesce("s"."code", ''), coalesce("s"."separator", '-'), coalesce("p"."correlative"::text, ''))`;
    const repo = this.getOrderRepo(tx);
    const qb = repo
      .createQueryBuilder("p")
      .innerJoin(WarehouseEntity, "wf", "wf.id = p.from_warehouse_id")
      .innerJoin(WarehouseEntity, "wt", "wt.id = p.to_warehouse_id")
      .innerJoin(DocumentSerie, "s", "s.serie_id = p.serie_id")
      .leftJoin(User, "creator", "creator.user_id = p.created_by")
      .addSelect("creator.name", "creator_name")
      .distinct(true);

    const filters = sanitizeProductionSearchFilters(params.filters);
    const needsSkuJoin = Boolean(
      params.q ||
      params.skuId ||
      filters.some((filter) => filter.field === ProductionSearchFields.SKU_ID),
    );

    if (needsSkuJoin) {
      qb
        .leftJoin(ProductionOrderItemEntity, "pi", "pi.production_id = p.production_id")
        .leftJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = pi.finished_item_id")
        .leftJoin(ProductCatalogSkuEntity, "sku", "sku.sku_id = si.sku_id")
        .leftJoin(ProductCatalogProductEntity, "product", "product.product_id = sku.product_id");
    }

    if (params.status) {
      qb.andWhere("p.status = :status", { status: params.status });
    }
    if (params.warehouseId) {
      qb.andWhere("(p.fromWarehouseId = :wid OR p.toWarehouseId = :wid)", { wid: params.warehouseId });
    }
    if (params.skuId) {
      qb.andWhere("si.sku_id = :skuId", { skuId: params.skuId });
    }
    if (params.from) {
      qb.andWhere("p.createdAt >= :from", { from: params.from });
    }
    if (params.to) {
      qb.andWhere("p.createdAt <= :to", { to: params.to });
    }

    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const startParam = `${fieldParam}_start`;
      const endParam = `${fieldParam}_end`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case ProductionSearchFields.WAREHOUSE_ID:
          if (!filter.values?.length) break;
          if (filter.mode === "exclude") {
            qb.andWhere(
              `("p"."from_warehouse_id" NOT IN (:...${valuesParam}) AND "p"."to_warehouse_id" NOT IN (:...${valuesParam}))`,
              { [valuesParam]: filter.values },
            );
            break;
          }

          qb.andWhere(
            new Brackets((warehouseQb) => {
              warehouseQb
                .where(`"p"."from_warehouse_id" IN (:...${valuesParam})`, { [valuesParam]: filter.values })
                .orWhere(`"p"."to_warehouse_id" IN (:...${valuesParam})`, { [valuesParam]: filter.values });
            }),
          );
          break;
        case ProductionSearchFields.FROM_WAREHOUSE_ID:
          if (filter.values?.length) {
            qb.andWhere(`"p"."from_warehouse_id" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ProductionSearchFields.TO_WAREHOUSE_ID:
          if (filter.values?.length) {
            qb.andWhere(`"p"."to_warehouse_id" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ProductionSearchFields.STATUS:
          if (filter.values?.length) {
            qb.andWhere(`"p"."status" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ProductionSearchFields.SKU_ID:
          if (filter.values?.length) {
            qb.andWhere(`"si"."sku_id" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ProductionSearchFields.CREATED_BY:
          if (filter.values?.length) {
            qb.andWhere(`"p"."created_by" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ProductionSearchFields.NUMBER:
          if (!filter.value) break;
          if (filter.operator === ProductionSearchOperators.EQ) {
            qb.andWhere(`lower(${numberExpression}) = lower(:${valueParam})`, {
              [valueParam]: filter.value,
            });
            break;
          }

          qb.andWhere(`${numberExpression} ILIKE :${valueParam}`, {
            [valueParam]: `%${filter.value}%`,
          });
          break;
        case ProductionSearchFields.REFERENCE:
          if (!filter.value) break;
          if (filter.operator === ProductionSearchOperators.EQ) {
            qb.andWhere(`lower(coalesce("p"."reference", '')) = lower(:${valueParam})`, {
              [valueParam]: filter.value,
            });
            break;
          }

          qb.andWhere(`unaccent(coalesce("p"."reference", '')) ILIKE unaccent(:${valueParam})`, {
            [valueParam]: `%${filter.value}%`,
          });
          break;
        case ProductionSearchFields.MANUFACTURE_DATE:
        case ProductionSearchFields.CREATED_AT: {
          const dateExpression =
            filter.field === ProductionSearchFields.MANUFACTURE_DATE
              ? `DATE("p"."manufacture_date")`
              : `DATE("p"."created_at")`;

          if (filter.operator === ProductionSearchOperators.BETWEEN) {
            if (!filter.range?.start || !filter.range?.end) break;
            qb.andWhere(`${dateExpression} BETWEEN :${startParam} AND :${endParam}`, {
              [startParam]: filter.range.start,
              [endParam]: filter.range.end,
            });
            break;
          }

          if (!filter.value) break;
          const sqlOperator =
            filter.operator === ProductionSearchOperators.BEFORE ? "<" :
            filter.operator === ProductionSearchOperators.AFTER ? ">" :
            filter.operator === ProductionSearchOperators.ON_OR_BEFORE ? "<=" :
            filter.operator === ProductionSearchOperators.ON_OR_AFTER ? ">=" :
            "=";

          qb.andWhere(`${dateExpression} ${sqlOperator} :${valueParam}`, {
            [valueParam]: filter.value,
          });
          break;
        }
        default:
          break;
      }
    });

    if (params.q) {
      const q = params.q.trim();
      const matchedStatuses = matchSearchOptionIds(q, PRODUCTION_STATUS_SEARCH_OPTIONS);

      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where(`${numberExpression} ILIKE :q`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("p"."reference", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("wf"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("wt"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("s"."code", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("s"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("creator"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("creator"."email", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`"p"."status"::text ILIKE :q`, { q: `%${q}%` });

          if (needsSkuJoin) {
            searchQb
              .orWhere(`unaccent(coalesce("sku"."backend_sku", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
              .orWhere(`unaccent(coalesce("sku"."custom_sku", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
              .orWhere(`unaccent(coalesce("sku"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
              .orWhere(`unaccent(coalesce("product"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` });
          }

          if (matchedStatuses.length) {
            searchQb.orWhere(`"p"."status" IN (:...matchedStatuses)`, { matchedStatuses });
          }
        }),
      );
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const total = await qb.clone().getCount();

    const listResult = await qb
      .orderBy("p.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getRawAndEntities();
    const rows = listResult.entities;

    const warehouseIds = Array.from(
      new Set(rows.flatMap((r) => [r.fromWarehouseId, r.toWarehouseId]).filter(Boolean)),
    );
    const serieIds = Array.from(new Set(rows.map((r) => r.serieId).filter(Boolean)));

    const warehouseRepo = this.getManager(tx).getRepository(WarehouseEntity);
    const serieRepo = this.getManager(tx).getRepository(DocumentSerie);

    const [warehouses, series] = await Promise.all([
      warehouseIds.length ? warehouseRepo.find({ where: { id: In(warehouseIds) } }) : Promise.resolve([]),
      serieIds.length ? serieRepo.find({ where: { id: In(serieIds) } }) : Promise.resolve([]),
    ]);

    const warehouseById = new Map<string, ProductionOrderListWarehouseRM>(
      warehouses.map((w) => [
        w.id,
        {
          id: w.id,
          name: w.name,
          department: w.department,
          province: w.province,
          district: w.district,
          address: w.address ?? null,
          isActive: w.isActive,
          createdAt: w.createdAt,
        },
      ]),
    );

    const serieById = new Map<string, ProductionOrderListSerieRM>(
      series.map((s) => [
        s.id,
        {
          id: s.id,
          code: s.code,
          name: s.name,
          docType: s.docType,
          warehouseId: s.warehouseId,
          nextNumber: s.nextNumber,
          padding: s.padding,
          separator: s.separator,
          isActive: s.isActive,
          createdAt: s.createdAt,
        },
      ]),
    );

    return {
      items: rows.map((row, index) => {
        const order = new ProductionOrder(
          row.id,
          row.fromWarehouseId,
          row.toWarehouseId,
          row.docType,
          row.serieId,
          row.correlative,
          row.status as ProductionStatus,
          row.manufactureDate,
          row.createdBy,
          row.createdAt,
          row.reference,
          row.updatedAt,
          row.updatedBy ?? null,
          row.imageProdution ?? [],
        );

        return {
          order,
          createdByName: listResult.raw[index]?.creator_name ?? null,
          fromWarehouse: row.fromWarehouseId ? warehouseById.get(row.fromWarehouseId) ?? null : null,
          toWarehouse: row.toWarehouseId ? warehouseById.get(row.toWarehouseId) ?? null : null,
          serie: row.serieId ? serieById.get(row.serieId) ?? null : null,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async update(
    params: {
      productionId: string;
      fromWarehouseId?: string;
      toWarehouseId?: string;
      serieId?: string;
      correlative?: number;
      reference?: string;
      manufactureDate?: Date;
      imageProdution?: string[];
      updatedBy?: string;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrder | null> {
    const repo = this.getOrderRepo(tx);
    const patch: Partial<ProductionOrderEntity> = {};

    if (params.fromWarehouseId !== undefined) patch.fromWarehouseId = params.fromWarehouseId;
    if (params.toWarehouseId !== undefined) patch.toWarehouseId = params.toWarehouseId;
    if (params.serieId !== undefined) patch.serieId = params.serieId;
    if (params.correlative !== undefined) patch.correlative = params.correlative;
    if (params.reference !== undefined) patch.reference = params.reference;
    if (params.manufactureDate !== undefined) patch.manufactureDate = params.manufactureDate;
    if (params.imageProdution !== undefined) patch.imageProdution = params.imageProdution;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;
    if (params.updatedBy !== undefined) {
      (patch as any).updatedBy = params.updatedBy;
    }

    await repo.update({ id: params.productionId }, patch);
    return this.findById(params.productionId, tx);
  }

  async setStatus(
    params: {
      productionId: string;
      status: ProductionStatus;
      updatedBy?: string;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void> {
    const repo = this.getOrderRepo(tx);
    const patch: Partial<ProductionOrderEntity> = {
      status: params.status,
    };
    if (params.updatedAt) patch.updatedAt = params.updatedAt;
    if (params.updatedBy) {
      (patch as any).updatedBy = params.updatedBy;
    }
    await repo.update(params.productionId, patch);
  }

  async listItems(productionId: string, tx?: TransactionContext): Promise<ProductionOrderItem[]> {
    const repo = this.getItemRepo(tx);
    const rows = await repo.find({ where: { productionId } });
    return rows.map(
      (r) =>
        new ProductionOrderItem(
          r.id,
          r.productionId,
          r.finishedItemId,
          r.fromLocationId,
          r.toLocationId,
          r.quantity,
          r.wasteQty ?? 0,
          r.unitCost,
        ),
    );
  }

  async removeItems(productionId: string, tx?: TransactionContext): Promise<number> {
    const repo = this.getItemRepo(tx);
    const result = await repo.delete({ productionId });
    return result.affected ?? 0;
  }

  async getByIdWithItems(
    productionId: string,
    tx?: TransactionContext,
  ): Promise<{ order: ProductionOrder; items: ProductionOrderItem[]; serie?: ProductionOrderListSerieRM | null } | null> {
    const order = await this.findById(productionId, tx);
    if (!order) return null;
    const items = await this.listItems(productionId, tx);
    const serieRepo = this.getManager(tx).getRepository(DocumentSerie);
    const serieRow = await serieRepo.findOne({ where: { id: order.serieId } });
    const serie: ProductionOrderListSerieRM | null = serieRow
      ? {
          id: serieRow.id,
          code: serieRow.code,
          name: serieRow.name,
          docType: DocTypeMapper.toProduction(serieRow.docType),
          warehouseId: serieRow.warehouseId,
          nextNumber: serieRow.nextNumber,
          padding: serieRow.padding,
          separator: serieRow.separator,
          isActive: serieRow.isActive,
          createdAt: serieRow.createdAt,
        }
      : null;
    return { order, items, serie };
  }

  async addItem(item: ProductionOrderItem, tx?: TransactionContext): Promise<ProductionOrderItem> {
    const repo = this.getItemRepo(tx);
    const saved = await repo.save({
      productionId: item.productionId,
      finishedItemId: item.finishedItemId,
      fromLocationId: item.fromLocationId,
      toLocationId: item.toLocationId,
      quantity: item.quantity,
      wasteQty: item.wasteQty ?? 0,
      unitCost: item.unitCost,
    });

    return new ProductionOrderItem(
      saved.id,
      saved.productionId,
      saved.finishedItemId,
      saved.fromLocationId,
      saved.toLocationId,
      saved.quantity,
      saved.wasteQty ?? 0,
      saved.unitCost,
    );
  }

  async updateItem(
    params: {
      productionId: string;
      itemId: string;
      finishedItemId?: string;
      fromLocationId?: string | null;
      toLocationId?: string | null;
      quantity?: number;
      wasteQty?: number;
      unitCost?: number;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrderItem | null> {
    const repo = this.getItemRepo(tx);
    const patch: Partial<ProductionOrderItemEntity> = {};

    if (params.finishedItemId !== undefined) patch.finishedItemId = params.finishedItemId;
    if (params.fromLocationId !== undefined) patch.fromLocationId = params.fromLocationId;
    if (params.toLocationId !== undefined) patch.toLocationId = params.toLocationId;
    if (params.quantity !== undefined) patch.quantity = params.quantity;
    if (params.wasteQty !== undefined) patch.wasteQty = params.wasteQty;
    if (params.unitCost !== undefined) {
      (patch as any).unitCost = params.unitCost;
    }

    await repo.update({ id: params.itemId, productionId: params.productionId }, patch);
    const updated = await repo.findOne({ where: { id: params.itemId, productionId: params.productionId } });
    if (!updated) return null;

    return new ProductionOrderItem(
      updated.id,
      updated.productionId,
      updated.finishedItemId,
      updated.fromLocationId,
      updated.toLocationId,
      updated.quantity,
      updated.wasteQty ?? 0,
      updated.unitCost,
    );
  }

  async removeItem(productionId: string, itemId: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getItemRepo(tx);
    const result = await repo.delete({ id: itemId, productionId });
    return (result.affected ?? 0) > 0;
  }
}
