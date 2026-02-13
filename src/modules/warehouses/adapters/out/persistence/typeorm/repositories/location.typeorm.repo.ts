import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context";
import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { LocartionRepository } from "src/modules/warehouses/domain/ports/location.repository.port";
import { WarehouseLocation } from "src/modules/warehouses/domain/entities/warehouse-location";
import { LocationId } from "src/modules/warehouses/domain/value-objects/location-id.vo";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WarehouseLocationEntity } from "../entities/warehouse-location";

@Injectable()
export class LocationTypeormRepo implements LocartionRepository {
  constructor(
    @InjectRepository(WarehouseLocationEntity)
    private readonly repo: Repository<WarehouseLocationEntity>
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(WarehouseLocationEntity);
  }

  private toDomain(row: WarehouseLocationEntity): WarehouseLocation {
    return new WarehouseLocation(
      new LocationId(row.id),
      new WarehouseId(row.warehouseId),
      row.code,
      row.description ?? undefined,
      row.isActive
    );
  }

  async findById(locationId: LocationId, tx?: TransactionContext): Promise<WarehouseLocation | null> {
    const row = await this.getRepo(tx).findOne({
      where: { id: locationId.value },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(location: WarehouseLocation, tx?: TransactionContext): Promise<WarehouseLocation> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      id: (location as any).locationId?.value ?? (location as any).locationId,
      warehouseId: (location as any).warehouseId?.value ?? (location as any).warehouseId,
      code: (location as any).code,
      description: (location as any).description ?? null,
      isActive: (location as any).isActive ?? true,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      locationId: LocationId;
      warehouseId?: WarehouseId;
      code?: string;
      description?: string;
    },
    tx?: TransactionContext
  ): Promise<WarehouseLocation> {
    const repo = this.getRepo(tx);

    await repo.update(
      { id: params.locationId.value },
      {
        warehouseId: params.warehouseId?.value,
        code: params.code,
        description: params.description ?? null,
      }
    );

    const updated = await repo.findOne({ where: { id: params.locationId.value } });
    if (!updated) {
      throw new Error("Location no encontrada");
    }
    return this.toDomain(updated);
  }

  async list(
    params: {
      warehouseId?: WarehouseId;
      code?: string;
      description?: string;
      q?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext
  ): Promise<{ items: WarehouseLocation[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("l");

    if (params.warehouseId) {
      qb.andWhere("l.warehouseId = :warehouseId", { warehouseId: params.warehouseId.value });
    }
    if (params.code) {
      qb.andWhere("unaccent(l.code) ILIKE unaccent(:code)", { code: `%${params.code}%` });
    }
    if (params.description) {
      qb.andWhere("unaccent(l.description) ILIKE unaccent(:description)", { description: `%${params.description}%` });
    }
    if (params.isActive !== undefined) {
      qb.andWhere("l.isActive = :isActive", { isActive: params.isActive });
    }
    if (params.q) {
      qb.andWhere("(unaccent(l.code) ILIKE unaccent(:q) OR unaccent(l.description) ILIKE unaccent(:q))", { q: `%${params.q}%` });
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("l.code", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
  async setActive(locationId: LocationId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: locationId.value }, { isActive });
  }

  async setActiveByWarehouseId(warehouseId: WarehouseId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ warehouseId: warehouseId.value }, { isActive });
  }
}
