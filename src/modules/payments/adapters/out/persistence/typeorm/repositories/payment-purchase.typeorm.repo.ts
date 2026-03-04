import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentPurchase } from "src/modules/payments/domain/entity/payment-purchase";
import { PaymentPurchaseDetail } from "src/modules/payments/domain/read-models/payment-purchase-detail.rm";
import { PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { PaymentPurchaseEntity } from "../entities/payment-purchase.entity";
import { PaymentDocumentEntity } from "../entities/payment-document.entity";

@Injectable()
export class PaymentPurchaseTypeormRepository implements PaymentPurchaseRepository {
  constructor(
    @InjectRepository(PaymentPurchaseEntity)
    private readonly repo: Repository<PaymentPurchaseEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PaymentPurchaseEntity);
  }

  private toDomain(row: PaymentPurchaseEntity): PaymentPurchase {
    return new PaymentPurchase(row.payDocId, row.poId, row.quotaId ?? undefined);
  }

  private toDetail(row: any): PaymentPurchaseDetail {
    return {
      payDocId: row.pay_doc_id,
      poId: row.po_id,
      quotaId: row.quota_id ?? null,
      method: row.method,
      date: row.date instanceof Date ? row.date : new Date(row.date),
      operationNumber: row.operation_number ?? null,
      currency: row.currency,
      amount: Number(row.amount),
      note: row.note ?? null,
      fromDocumentType: row.from_document_type,
    };
  }

  async findByPayDocId(payDocId: string, tx?: TransactionContext): Promise<PaymentPurchaseDetail | null> {
    const qb = this.getRepo(tx)
      .createQueryBuilder("pp")
      .innerJoin(PaymentDocumentEntity, "pd", "pd.pay_doc_id = pp.pay_doc_id")
      .where("pp.pay_doc_id = :payDocId", { payDocId })
      .select([
        "pp.pay_doc_id AS pay_doc_id",
        "pp.po_id AS po_id",
        "pp.quota_id AS quota_id",
        "pd.method AS method",
        "pd.date AS date",
        "pd.operation_number AS operation_number",
        "pd.currency AS currency",
        "pd.amount AS amount",
        "pd.note AS note",
        "pd.from_document_type AS from_document_type",
      ]);

    const row = await qb.getRawOne();
    return row ? this.toDetail(row) : null;
  }

  async create(link: PaymentPurchase, tx?: TransactionContext): Promise<PaymentPurchase> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      payDocId: link.payDocId,
      poId: link.poId,
      quotaId: link.quotaId ?? null,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async list(
    params: { poId?: string; quotaId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: PaymentPurchaseDetail[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo
      .createQueryBuilder("pp")
      .innerJoin(PaymentDocumentEntity, "pd", "pd.pay_doc_id = pp.pay_doc_id");

    if (params.poId) qb.andWhere("pp.po_id = :poId", { poId: params.poId });
    if (params.quotaId) qb.andWhere("pp.quota_id = :quotaId", { quotaId: params.quotaId });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const total = await qb.getCount();

    const rows = await qb
      .select([
        "pp.pay_doc_id AS pay_doc_id",
        "pp.po_id AS po_id",
        "pp.quota_id AS quota_id",
        "pd.method AS method",
        "pd.date AS date",
        "pd.operation_number AS operation_number",
        "pd.currency AS currency",
        "pd.amount AS amount",
        "pd.note AS note",
        "pd.from_document_type AS from_document_type",
      ])
      .orderBy("pd.date", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany();

    return { items: rows.map((r) => this.toDetail(r)), total };
  }
}
