import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WarehouseEntity } from "../entities/warehouse";
import { WarehouseLocationEntity } from "../entities/warehouse-location";
import { WarehouseLocation } from "src/modules/warehouses/domain/entities/warehouse-location";
import { LocationId } from "src/modules/warehouses/domain/value-objects/location-id.vo";
import { WarehouseRepository } from "src/modules/warehouses/application/ports/warehouse.repository.port";
import { WarehouseFactory } from "src/modules/warehouses/domain/factories/warehouse.factory";
import {
  matchSearchOptionIds,
  sanitizeWarehouseSearchFilters,
  WAREHOUSE_ACTIVE_STATE_SEARCH_OPTIONS,
} from "src/modules/warehouses/application/support/warehouse-search.utils";
import { WarehouseSearchFields, WarehouseSearchOperators, WarehouseSearchRule } from "src/modules/warehouses/application/dtos/warehouse-search/warehouse-search-snapshot";

@Injectable()
export class WarehouseTypeormRepo implements WarehouseRepository {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly repo: Repository<WarehouseEntity>
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(WarehouseEntity);
  }

  private toDomain(row: WarehouseEntity): Warehouse {
    return WarehouseFactory.createWarehouse({
      warehouseId: new WarehouseId(row.id),
      name: row.name,
      department: row.department,
      province: row.province,
      district: row.district,
      address: row.address ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
    });
  }

  async findById(warehouseId: WarehouseId, tx?: TransactionContext): Promise<Warehouse | null> {
    const row = await this.getRepo(tx).findOne({
      where: { id: warehouseId.value },
    });
    return row ? this.toDomain(row) : null;
  }
  async findByIdLocations(
    warehouseId: WarehouseId,
    tx?: TransactionContext
  ): Promise<{ warehouse: Warehouse; items: WarehouseLocation[] } | null> {
    const warehouseRow = await this.getRepo(tx).findOne({
      where: { id: warehouseId.value },
    });

    if (!warehouseRow) {
      return null;
    }

    const locationRows = await this.getManager(tx)
      .getRepository(WarehouseLocationEntity)
      .find({ where: { warehouseId: warehouseId.value } });

    const items = locationRows.map(
      (r) =>
        WarehouseFactory.createLocation({
          locationId: new LocationId(r.id),
          warehouseId: new WarehouseId(r.warehouseId),
          code: r.code,
          description: r.description ?? undefined,
          isActive: r.isActive,
        })
    );

    return { warehouse: this.toDomain(warehouseRow), items };
  }

  async create(warehouse: Warehouse, tx?: TransactionContext): Promise<Warehouse> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      id: undefined,
      name: warehouse.name,
      department: warehouse.department,
      province: warehouse.province,
      district: warehouse.district,
      address: warehouse.address ?? null,
      isActive: warehouse.isActive ?? true,
      createdAt: warehouse.createdAt ?? undefined,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      warehouseId: WarehouseId;
      name?: string;
      department?: string;
      province?: string;
      district?: string;
      address?: string;
    },
    tx?: TransactionContext
  ): Promise<Warehouse | null> {
    const repo = this.getRepo(tx);

    await repo.update(
      { id: params.warehouseId.value },
      {
        name: params.name,
        department: params.department,
        province: params.province,
        district: params.district,
        address: params.address ?? null,
      }
    );

    const updated = await repo.findOne({ where: { id: params.warehouseId.value } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(warehouseId: WarehouseId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: warehouseId.value }, { isActive });
  }

  async list(
    params: {
      filters?: WarehouseSearchRule[];
      q?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext
  ): Promise<{ items: Warehouse[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("w");

    const filters = sanitizeWarehouseSearchFilters(params.filters);
    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case WarehouseSearchFields.IS_ACTIVE:
          if (filter.values?.length) {
            qb.andWhere(`w.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case WarehouseSearchFields.DEPARTMENT:
        case WarehouseSearchFields.PROVINCE:
        case WarehouseSearchFields.DISTRICT: {
          if (!filter.values?.length) break;
          const column =
            filter.field === WarehouseSearchFields.DEPARTMENT ? "w.department" :
            filter.field === WarehouseSearchFields.PROVINCE ? "w.province" :
            "w.district";

          qb.andWhere(`unaccent(${column}) ${catalogOperator} (:...${valuesParam})`, {
            [valuesParam]: filter.values,
          });
          break;
        }
        case WarehouseSearchFields.NAME:
        case WarehouseSearchFields.ADDRESS: {
          if (!filter.value) break;
          const column = filter.field === WarehouseSearchFields.NAME ? "w.name" : "w.address";

          if (filter.operator === WarehouseSearchOperators.EQ) {
            qb.andWhere(`unaccent(coalesce(${column}, '')) = unaccent(:${valueParam})`, {
              [valueParam]: filter.value,
            });
          } else {
            qb.andWhere(`unaccent(coalesce(${column}, '')) ILIKE unaccent(:${valueParam})`, {
              [valueParam]: `%${filter.value}%`,
            });
          }
          break;
        }
        default:
          break;
      }
    });

    if (params.q) {
      const q = params.q.trim();
      const matchedActiveStates = matchSearchOptionIds(q, WAREHOUSE_ACTIVE_STATE_SEARCH_OPTIONS);

      qb.andWhere(
        [
          "(unaccent(coalesce(w.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(w.department, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(w.province, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(w.district, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(w.address, '')) ILIKE unaccent(:q)",
          matchedActiveStates.length ? "OR w.isActive IN (:...matchedActiveStates)" : "",
          ")",
        ].join(" "),
        {
          q: `%${q}%`,
          ...(matchedActiveStates.length
            ? { matchedActiveStates: matchedActiveStates.map((value) => value === "true") }
            : {}),
        }
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const [rows, total] = await qb
      .orderBy("w.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async listSearchCatalogs(tx?: TransactionContext): Promise<{
    departments: ListingSearchOptionOutput[];
    provinces: ListingSearchOptionOutput[];
    districts: ListingSearchOptionOutput[];
  }> {
    const repo = this.getRepo(tx);
    const [departments, provinces, districts] = await Promise.all([
      repo
        .createQueryBuilder("w")
        .select("DISTINCT w.department", "value")
        .where("w.department IS NOT NULL")
        .orderBy("value", "ASC")
        .getRawMany<{ value: string }>(),
      repo
        .createQueryBuilder("w")
        .select("DISTINCT w.province", "value")
        .where("w.province IS NOT NULL")
        .orderBy("value", "ASC")
        .getRawMany<{ value: string }>(),
      repo
        .createQueryBuilder("w")
        .select("DISTINCT w.district", "value")
        .where("w.district IS NOT NULL")
        .orderBy("value", "ASC")
        .getRawMany<{ value: string }>(),
    ]);

    const toOptions = (items: Array<{ value: string }>) =>
      items
        .map((item) => item.value?.trim())
        .filter(Boolean)
        .map((value) => ({ id: value, label: value }));

    return {
      departments: toOptions(departments),
      provinces: toOptions(provinces),
      districts: toOptions(districts),
    };
  }
}
