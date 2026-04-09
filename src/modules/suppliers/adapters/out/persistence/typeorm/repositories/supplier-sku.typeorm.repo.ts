import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Money } from "src/shared/value-objets/money.vo";
import { SupplierSku } from "src/modules/suppliers/domain/entity/supplierSku";
import { SupplierSkuRepository } from "src/modules/suppliers/domain/ports/supplier-sku.repository";
import { SupplierSkuEntity } from "../entities/supplier-sku.entity";

@Injectable()
export class SupplierSkuTypeormRepository implements SupplierSkuRepository {
  constructor(
    @InjectRepository(SupplierSkuEntity)
    private readonly repo: Repository<SupplierSkuEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SupplierSkuEntity);
  }

  private toDomain(row: SupplierSkuEntity): SupplierSku {
    return SupplierSku.create({
      supplierId: row.supplierId,
      skuId: row.skuId,
      supplierSku: row.supplierSku ?? undefined,
      lastCost:
        row.lastCost === null || row.lastCost === undefined
          ? undefined
          : Money.create(Number(row.lastCost)),
      leadTimeDays: row.leadTimeDays ?? undefined,
    });
  }

  async findById(supplierId: string, skuId: string, tx?: TransactionContext): Promise<SupplierSku | null> {
    const row = await this.getRepo(tx).findOne({ where: { supplierId, skuId } });
    return row ? this.toDomain(row) : null;
  }

  async create(row: SupplierSku, tx?: TransactionContext): Promise<SupplierSku> {
    const saved = await this.getRepo(tx).save({
      supplierId: row.supplierId,
      skuId: row.skuId,
      supplierSku: row.supplierSku ?? null,
      lastCost: row.lastCost?.getAmount() ?? null,
      leadTimeDays: row.leadTimeDays ?? null,
    });
    return this.toDomain(saved);
  }

  async update(
    params: {
      supplierId: string;
      skuId: string;
      supplierSku?: string;
      lastCost?: Money;
      leadTimeDays?: number;
    },
    tx?: TransactionContext,
  ): Promise<SupplierSku | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<SupplierSkuEntity> = {};

    if (params.supplierSku !== undefined) patch.supplierSku = params.supplierSku;
    if (params.lastCost !== undefined) patch.lastCost = params.lastCost.getAmount();
    if (params.leadTimeDays !== undefined) patch.leadTimeDays = params.leadTimeDays;

    await repo.update({ supplierId: params.supplierId, skuId: params.skuId }, patch);
    const updated = await repo.findOne({ where: { supplierId: params.supplierId, skuId: params.skuId } });
    return updated ? this.toDomain(updated) : null;
  }

  async list(
    params: { supplierId?: string; skuId?: string; supplierSku?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: SupplierSku[]; total: number }> {
    const qb = this.getRepo(tx).createQueryBuilder("ss");

    if (params.supplierId) qb.andWhere("ss.supplierId = :supplierId", { supplierId: params.supplierId });
    if (params.skuId) qb.andWhere("ss.skuId = :skuId", { skuId: params.skuId });
    if (params.supplierSku) qb.andWhere("ss.supplierSku ILIKE :supplierSku", { supplierSku: `%${params.supplierSku}%` });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const [rows, total] = await qb.orderBy("ss.supplierId", "ASC").skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items: rows.map((row) => this.toDomain(row)), total };
  }
}
