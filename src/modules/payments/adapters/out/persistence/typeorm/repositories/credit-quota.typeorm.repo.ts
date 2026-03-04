import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CreditQuotaEntity } from "../entities/credit-quota.entity";
import { CreditQuotaPurchaseEntity } from "../entities/credit-quota-purchase.entity";

@Injectable()
export class CreditQuotaTypeormRepository implements CreditQuotaRepository {
  constructor(
    @InjectRepository(CreditQuotaEntity)
    private readonly repo: Repository<CreditQuotaEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(CreditQuotaEntity);
  }

  private toDomain(row: CreditQuotaEntity): CreditQuota {
    return new CreditQuota(
      row.id,
      row.number,
      row.expirationDate,
      Number(row.totalToPay),
      Number(row.totalPaid),
      row.paymentDate ?? undefined,
      row.createdAt ?? undefined,
    );
  }

  async findById(quotaId: string, tx?: TransactionContext): Promise<CreditQuota | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: quotaId } });
    return row ? this.toDomain(row) : null;
  }

  async create(quota: CreditQuota, tx?: TransactionContext): Promise<CreditQuota> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: quota.quotaId,
      number: quota.number,
      expirationDate: quota.expirationDate,
      paymentDate: quota.paymentDate ?? null,
      totalToPay: quota.totalToPay,
      totalPaid: quota.totalPaid ?? 0,
      createdAt: quota.createdAt ?? undefined,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async deleteById(quotaId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id: quotaId });
  }

  async list(
    params: { poId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: CreditQuota[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("cq");

    if (params.poId) {
      qb.innerJoin(CreditQuotaPurchaseEntity, "cqp", "cqp.quota_id = cq.quota_id")
        .andWhere("cqp.po_id = :poId", { poId: params.poId });
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("cq.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}
