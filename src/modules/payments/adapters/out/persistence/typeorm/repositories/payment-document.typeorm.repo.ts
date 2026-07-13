import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import {
  ListPaymentDocumentsParams,
  PaymentDocumentRepository,
  PaymentStatus,
} from "src/modules/payments/domain/ports/payment-document.repository";
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
      accountPayableId: row.accountPayableId ?? undefined,
      companyPaymentAccountId: row.companyPaymentAccountId ?? undefined,
      paymentMethodId: row.paymentMethodId ?? undefined,
      status: row.status,
      requestedByUserId: row.requestedByUserId ?? undefined,
      approvedByUserId: row.approvedByUserId ?? undefined,
      rejectedByUserId: row.rejectedByUserId ?? undefined,
      approvedAt: row.approvedAt ?? undefined,
      rejectedAt: row.rejectedAt ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      paidByUserId: row.paidByUserId ?? undefined,
      scheduledByUserId: row.scheduledByUserId ?? undefined,
      scheduledAt: row.scheduledAt ?? undefined,
      paidAt: row.paidAt ?? undefined,
      paymentEvidenceFileId: row.paymentEvidenceFileId ?? undefined,
      bankName: row.bankName ?? undefined,
      cardLastFour: row.cardLastFour ?? undefined,
      operationCode: row.operationCode ?? undefined,
      isPartial: row.isPartial,
      companyPaymentAccountMaskedLabel: row.bankName && row.cardLastFour ? `${row.bankName} ****${row.cardLastFour}` : undefined,
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

  async findApprovedByAccountPayableId(
    accountPayableId: string,
    tx?: TransactionContext,
  ): Promise<PaymentDocument[]> {
    const rows = await this.getRepo(tx).find({ where: { accountPayableId, status: "APPROVED" } });
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
      accountPayableId: document.accountPayableId ?? null,
      companyPaymentAccountId: document.companyPaymentAccountId ?? null,
      paymentMethodId: document.paymentMethodId ?? null,
      status: document.status,
      requestedByUserId: document.requestedByUserId ?? null,
      approvedByUserId: document.approvedByUserId ?? null,
      rejectedByUserId: document.rejectedByUserId ?? null,
      approvedAt: document.approvedAt ?? null,
      rejectedAt: document.rejectedAt ?? null,
      rejectionReason: document.rejectionReason ?? null,
      paidByUserId: document.paidByUserId ?? null,
      scheduledByUserId: document.scheduledByUserId ?? null,
      scheduledAt: document.scheduledAt ?? null,
      paidAt: document.paidAt ?? null,
      paymentEvidenceFileId: document.paymentEvidenceFileId ?? null,
      bankName: document.bankName ?? null,
      cardLastFour: document.cardLastFour ?? null,
      operationCode: document.operationCode ?? null,
      isPartial: document.isPartial,
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
      accountPayableId: document.accountPayableId ?? null,
      companyPaymentAccountId: document.companyPaymentAccountId ?? null,
      paymentMethodId: document.paymentMethodId ?? null,
      status: document.status,
      requestedByUserId: document.requestedByUserId ?? null,
      approvedByUserId: document.approvedByUserId ?? null,
      rejectedByUserId: document.rejectedByUserId ?? null,
      approvedAt: document.approvedAt ?? null,
      rejectedAt: document.rejectedAt ?? null,
      rejectionReason: document.rejectionReason ?? null,
      paidByUserId: document.paidByUserId ?? null,
      scheduledByUserId: document.scheduledByUserId ?? null,
      scheduledAt: document.scheduledAt ?? null,
      paidAt: document.paidAt ?? null,
      paymentEvidenceFileId: document.paymentEvidenceFileId ?? null,
      bankName: document.bankName ?? null,
      cardLastFour: document.cardLastFour ?? null,
      operationCode: document.operationCode ?? null,
      isPartial: document.isPartial,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async deleteById(payDocId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id: payDocId });
  }

  async list(
    params: ListPaymentDocumentsParams,
    tx?: TransactionContext,
  ): Promise<{ items: PaymentDocument[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("pd");

    if (params.poId) qb.andWhere("pd.poId = :poId", { poId: params.poId });
    if (params.quotaId) qb.andWhere("pd.quotaId = :quotaId", { quotaId: params.quotaId });
    if (params.accountPayableId) {
      qb.andWhere("pd.accountPayableId = :accountPayableId", { accountPayableId: params.accountPayableId });
    }

    const statuses = this.mergeValues<PaymentStatus>(params.status ? [params.status] : undefined, params.statuses);
    if (statuses.length === 1) {
      qb.andWhere("pd.status = :status", { status: statuses[0] });
    } else if (statuses.length > 1) {
      qb.andWhere("pd.status IN (:...statuses)", { statuses });
    }

    if (params.currency) qb.andWhere("pd.currency = :currency", { currency: params.currency });

    const paymentMethodIds = this.mergeValues(
      params.paymentMethodId ? [params.paymentMethodId] : undefined,
      params.paymentMethodIds,
    );
    if (paymentMethodIds.length === 1) {
      qb.andWhere("pd.paymentMethodId = :paymentMethodId", { paymentMethodId: paymentMethodIds[0] });
    } else if (paymentMethodIds.length > 1) {
      qb.andWhere("pd.paymentMethodId IN (:...paymentMethodIds)", { paymentMethodIds });
    }

    const companyPaymentAccountIds = this.mergeValues(
      params.companyPaymentAccountId ? [params.companyPaymentAccountId] : undefined,
      params.companyPaymentAccountIds,
    );
    if (companyPaymentAccountIds.length === 1) {
      qb.andWhere("pd.companyPaymentAccountId = :companyPaymentAccountId", {
        companyPaymentAccountId: companyPaymentAccountIds[0],
      });
    } else if (companyPaymentAccountIds.length > 1) {
      qb.andWhere("pd.companyPaymentAccountId IN (:...companyPaymentAccountIds)", { companyPaymentAccountIds });
    }

    if (params.fromDocumentType) {
      qb.andWhere("pd.fromDocumentType = :fromDocumentType", { fromDocumentType: params.fromDocumentType });
    }

    this.applyDateRange(qb, "pd.date", "date", params.dateFrom, params.dateTo);
    this.applyDateRange(qb, "pd.scheduledAt", "scheduled", params.scheduledFrom, params.scheduledTo);
    this.applyDateRange(qb, "pd.paidAt", "paid", params.paidFrom, params.paidTo);

    if (params.amountMin !== undefined) qb.andWhere("pd.amount >= :amountMin", { amountMin: params.amountMin });
    if (params.amountMax !== undefined) qb.andWhere("pd.amount <= :amountMax", { amountMax: params.amountMax });

    if (params.requestedByUserId) {
      qb.andWhere("pd.requestedByUserId = :requestedByUserId", { requestedByUserId: params.requestedByUserId });
    }
    if (params.approvedByUserId) {
      qb.andWhere("pd.approvedByUserId = :approvedByUserId", { approvedByUserId: params.approvedByUserId });
    }

    if (params.hasEvidence === true) qb.andWhere("pd.paymentEvidenceFileId IS NOT NULL");
    if (params.hasEvidence === false) qb.andWhere("pd.paymentEvidenceFileId IS NULL");

    const q = params.q?.trim();
    if (q) {
      qb.andWhere(
        `(${[
          "pd.method ILIKE :q",
          "pd.operationNumber ILIKE :q",
          "pd.operationCode ILIKE :q",
          "pd.note ILIKE :q",
          "pd.bankName ILIKE :q",
        ].join(" OR ")})`,
        { q: `%${q}%` },
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("pd.date", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  private mergeValues<T>(...groups: Array<T[] | undefined>): T[] {
    return Array.from(new Set(groups.flatMap((group) => group ?? []).filter(Boolean)));
  }

  private applyDateRange(
    qb: Pick<ReturnType<Repository<PaymentDocumentEntity>["createQueryBuilder"]>, "andWhere">,
    column: string,
    prefix: string,
    from?: string,
    to?: string,
  ) {
    if (from) qb.andWhere(`DATE(${column}) >= :${prefix}From`, { [`${prefix}From`]: this.toDateOnly(from) });
    if (to) qb.andWhere(`DATE(${column}) <= :${prefix}To`, { [`${prefix}To`]: this.toDateOnly(to) });
  }

  private toDateOnly(value: string): string {
    return value.slice(0, 10);
  }
}
