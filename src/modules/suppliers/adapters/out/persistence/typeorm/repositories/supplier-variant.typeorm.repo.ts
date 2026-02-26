import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { SupplierVariant } from "src/modules/suppliers/domain/entity/supplierVariant";
import { SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { SupplierVariantEntity } from "../entities/supplier-variant.entity";

@Injectable()
export class SupplierVariantTypeormRepository implements SupplierVariantRepository {
  constructor(
    @InjectRepository(SupplierVariantEntity)
    private readonly repo: Repository<SupplierVariantEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SupplierVariantEntity);
  }

  private toDomain(row: SupplierVariantEntity): SupplierVariant {
    return new SupplierVariant(
      row.supplierId,
      row.variantId,
      row.supplierSku ?? undefined,
      row.lastCost === null || row.lastCost === undefined ? undefined : Money.create(Number(row.lastCost)),
      row.leadTimeDays ?? undefined,
    );
  }

  async findById(
    supplierId: string,
    variantId: string,
    tx?: TransactionContext,
  ): Promise<SupplierVariant | null> {
    const row = await this.getRepo(tx).findOne({ where: { supplierId, variantId } });
    return row ? this.toDomain(row) : null;
  }

  async create(variant: SupplierVariant, tx?: TransactionContext): Promise<SupplierVariant> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      supplierId: variant.supplierId,
      variantId: variant.variantId,
      supplierSku: variant.supplierSku ?? null,
      lastCost: variant.lastCost ? variant.lastCost.getAmount() : null,
      leadTimeDays: variant.leadTimeDays ?? null,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      supplierId: string;
      variantId: string;
      supplierSku?: string;
      lastCost?: Money;
      leadTimeDays?: number;
    },
    tx?: TransactionContext,
  ): Promise<SupplierVariant> {
    const repo = this.getRepo(tx);
    const patch: Partial<SupplierVariantEntity> = {};

    if (params.supplierSku !== undefined) patch.supplierSku = params.supplierSku;
    if (params.lastCost !== undefined) patch.lastCost = params.lastCost.getAmount();
    if (params.leadTimeDays !== undefined) patch.leadTimeDays = params.leadTimeDays;

    await repo.update({ supplierId: params.supplierId, variantId: params.variantId }, patch);
    const updated = await repo.findOne({ where: { supplierId: params.supplierId, variantId: params.variantId } });
    return this.toDomain(updated!);
  }

  async list(
    params: { supplierId?: string; variantId?: string; supplierSku?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: SupplierVariant[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("sv");

    if (params.supplierId) qb.andWhere("sv.supplierId = :supplierId", { supplierId: params.supplierId });
    if (params.variantId) qb.andWhere("sv.variantId = :variantId", { variantId: params.variantId });
    if (params.supplierSku) qb.andWhere("sv.supplierSku ILIKE :supplierSku", { supplierSku: `%${params.supplierSku}%` });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("sv.supplierId", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}
