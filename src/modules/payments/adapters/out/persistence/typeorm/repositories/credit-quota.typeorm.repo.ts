import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CreditQuotaEntity } from "../entities/credit-quota.entity";

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
    return CreditQuota.create({
      quotaId: row.id,
      number: row.number,
      expirationDate: row.expirationDate,
      totalToPay: Number(row.totalToPay),
      totalPaid: Number(row.totalPaid),
      fromDocumentType: row.fromDocumentType,
      paymentDate: row.paymentDate ?? undefined,
      createdAt: row.createdAt ?? undefined,
      poId: row.poId ?? undefined,
    });
  }

  async findById(quotaId: string, tx?: TransactionContext): Promise<CreditQuota | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: quotaId } });
    return row ? this.toDomain(row) : null;
  }

  async findByPoId(poId: string, tx?: TransactionContext): Promise<CreditQuota[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("cq")
      .where("cq.poId = :poId", { poId })
      .orderBy("cq.createdAt", "ASC")
      .getMany();

    return rows.map((r) => this.toDomain(r));
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
      fromDocumentType: quota.fromDocumentType,
      poId: quota.poId ?? null,
      createdAt: quota.createdAt ?? undefined,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async updateTotalPaid(quotaId: string, totalPaid: number, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: quotaId }, { totalPaid });
  }

  async updatePaymentDate(quotaId: string, paymentDate: Date | null, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: quotaId }, { paymentDate });
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
      qb.andWhere("cq.poId = :poId", { poId: params.poId });
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
