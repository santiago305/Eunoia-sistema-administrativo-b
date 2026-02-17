import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context";
import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WarehouseEntity } from "../entities/warehouse";
import { WarehouseLocationEntity } from "../entities/warehouse-location";
import { WarehouseLocation } from "src/modules/warehouses/domain/entities/warehouse-location";
import { LocationId } from "src/modules/warehouses/domain/value-objects/location-id.vo";

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
    return new Warehouse(
      new WarehouseId(row.id),
      row.name,
      row.department,
      row.province,
      row.district,
      row.address ?? undefined,
      row.isActive,
      row.createdAt
    );
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
        new WarehouseLocation(
          new LocationId(r.id),
          new WarehouseId(r.warehouseId),
          r.code,
          r.description ?? undefined,
          r.isActive
        )
    );

    return { warehouse: this.toDomain(warehouseRow), items };
  }


  async create(warehouse: Warehouse, tx?: TransactionContext): Promise<Warehouse> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      id: (warehouse as any).warehouseId?.value ?? (warehouse as any).warehouseId,
      name: (warehouse as any).name,
      department: (warehouse as any).department,
      province: (warehouse as any).province,
      district: (warehouse as any).district,
      address: (warehouse as any).address ?? null,
      isActive: (warehouse as any).isActive ?? true,
      createdAt: (warehouse as any).createdAt ?? undefined,
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
      isActive?: boolean;
      name?: string;
      department?: string;
      province?: string;
      district?: string;
      address?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext
  ): Promise<{ items: Warehouse[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("w");

    if (params.isActive !== undefined) {
      qb.andWhere("w.isActive = :isActive", { isActive: params.isActive });
    }
    if (params.name) {
      qb.andWhere("unaccent(w.name) ILIKE unaccent(:name)", { name: `%${params.name}%` });
    }
    if (params.department) {
      qb.andWhere("unaccent(w.department) ILIKE unaccent(:department)", { department: `%${params.department}%` });
    }
    if (params.province) {
      qb.andWhere("unaccent(w.province) ILIKE unaccent(:province)", { province: `%${params.province}%` });
    }
    if (params.district) {
      qb.andWhere("unaccent(w.district) ILIKE unaccent(:district)", { district: `%${params.district}%` });
    }
    if (params.address) {
      qb.andWhere("unaccent(w.address) ILIKE unaccent(:address)", { address: `%${params.address}%` });
    }
    if (params.q) {
      qb.andWhere(
        "(unaccent(w.name) ILIKE unaccent(:q) OR unaccent(w.department) ILIKE unaccent(:q) OR unaccent(w.province) ILIKE unaccent(:q) OR unaccent(w.district) ILIKE unaccent(:q) OR unaccent(w.address) ILIKE unaccent(:q))",
        { q: `%${params.q}%` }
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("w.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}
