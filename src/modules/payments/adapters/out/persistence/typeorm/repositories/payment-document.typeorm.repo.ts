import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { PaymentDocumentEntity } from "../entities/payment-document.entity";

@Injectable()
export class PaymentDocumentTypeormRepository implements PaymentDocumentRepository {
  constructor(
    @InjectRepository(PaymentDocumentEntity)
    private readonly repo: Repository<PaymentDocumentEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PaymentDocumentEntity);
  }

  private toDomain(row: PaymentDocumentEntity): PaymentDocument {
    return PaymentDocument.create({
      payDocId: row.id,
      method: row.method,
      date: row.date,
      currency: row.currency,
      amount: Number(row.amount),
      fromDocumentType: row.fromDocumentType,
      operationNumber: row.operationNumber ?? undefined,
      note: row.note ?? undefined,
      poId: row.poId ?? undefined,
      quotaId: row.quotaId ?? undefined,
      status: row.status,
      requestedByUserId: row.requestedByUserId ?? undefined,
      approvedByUserId: row.approvedByUserId ?? undefined,
      rejectedByUserId: row.rejectedByUserId ?? undefined,
      approvedAt: row.approvedAt ?? undefined,
      rejectedAt: row.rejectedAt ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
    });
  }

  async findById(payDocId: string, tx?: TransactionContext): Promise<PaymentDocument | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: payDocId } });
    return row ? this.toDomain(row) : null;
  }

  async findByPoId(poId: string, tx?: TransactionContext): Promise<PaymentDocument[]> {
    const rows = await this.getRepo(tx).find({ where: { poId } });
    return rows.map((r) => this.toDomain(r));
  }

  async findLatestByQuotaId(
    quotaId: string,
    excludePayDocId?: string,
    tx?: TransactionContext,
  ): Promise<PaymentDocument | null> {
    const qb = this.getRepo(tx)
      .createQueryBuilder("pd")
      .where("pd.quotaId = :quotaId", { quotaId });

    if (excludePayDocId) {
      qb.andWhere("pd.id != :excludePayDocId", { excludePayDocId });
    }

    const row = await qb.orderBy("pd.date", "DESC").getOne();
    return row ? this.toDomain(row) : null;
  }

  async create(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: document.payDocId,
      method: document.method,
      date: document.date,
      operationNumber: document.operationNumber ?? null,
      currency: document.currency,
      amount: document.amount,
      note: document.note ?? null,
      fromDocumentType: document.fromDocumentType,
      poId: document.poId ?? null,
      quotaId: document.quotaId ?? null,
      status: document.status,
      requestedByUserId: document.requestedByUserId ?? null,
      approvedByUserId: document.approvedByUserId ?? null,
      rejectedByUserId: document.rejectedByUserId ?? null,
      approvedAt: document.approvedAt ?? null,
      rejectedAt: document.rejectedAt ?? null,
      rejectionReason: document.rejectionReason ?? null,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: document.payDocId,
      method: document.method,
      date: document.date,
      operationNumber: document.operationNumber ?? null,
      currency: document.currency,
      amount: document.amount,
      note: document.note ?? null,
      fromDocumentType: document.fromDocumentType,
      poId: document.poId ?? null,
      quotaId: document.quotaId ?? null,
      status: document.status,
      requestedByUserId: document.requestedByUserId ?? null,
      approvedByUserId: document.approvedByUserId ?? null,
      rejectedByUserId: document.rejectedByUserId ?? null,
      approvedAt: document.approvedAt ?? null,
      rejectedAt: document.rejectedAt ?? null,
      rejectionReason: document.rejectionReason ?? null,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async deleteById(payDocId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id: payDocId });
  }

  async list(
    params: { poId?: string; quotaId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: PaymentDocument[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("pd");

    if (params.poId) qb.andWhere("pd.poId = :poId", { poId: params.poId });
    if (params.quotaId) qb.andWhere("pd.quotaId = :quotaId", { quotaId: params.quotaId });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("pd.date", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}
