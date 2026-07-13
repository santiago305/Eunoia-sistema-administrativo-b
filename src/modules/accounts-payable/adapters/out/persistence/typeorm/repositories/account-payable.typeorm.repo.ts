import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { AccountPayable } from "src/modules/accounts-payable/domain/entity/account-payable";
import { AccountPayableRepository } from "src/modules/accounts-payable/domain/ports/account-payable.repository";
import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { AccountPayableEntity } from "../entities/account-payable.entity";

@Injectable()
export class AccountPayableTypeormRepository implements AccountPayableRepository {
  constructor(
    @InjectRepository(AccountPayableEntity)
    private readonly repo: Repository<AccountPayableEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(AccountPayableEntity);
  }

  private toDomain(row: AccountPayableEntity): AccountPayable {
    return AccountPayable.create({
      accountPayableId: row.id,
      purchaseId: row.purchaseId,
      quotaId: row.quotaId ?? undefined,
      supplierId: row.supplierId ?? undefined,
      description: row.description ?? undefined,
      currency: row.currency,
      amountTotal: Number(row.amountTotal),
      amountPaid: Number(row.amountPaid),
      amountPending: Number(row.amountPending),
      dueDate: row.dueDate ?? undefined,
      status: row.status,
      createdByUserId: row.createdByUserId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(payable: AccountPayable, tx?: TransactionContext): Promise<AccountPayable> {
    const row = this.getRepo(tx).create({
      id: payable.accountPayableId,
      purchaseId: payable.purchaseId,
      quotaId: payable.quotaId ?? null,
      supplierId: payable.supplierId ?? null,
      description: payable.description ?? null,
      currency: payable.currency,
      amountTotal: payable.amountTotal,
      amountPaid: payable.amountPaid,
      amountPending: payable.amountPending,
      dueDate: payable.dueDate ?? null,
      status: payable.status,
      createdByUserId: payable.createdByUserId ?? null,
    });
    return this.toDomain(await this.getRepo(tx).save(row));
  }

  async update(payable: AccountPayable, tx?: TransactionContext): Promise<AccountPayable> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: payable.accountPayableId,
      purchaseId: payable.purchaseId,
      quotaId: payable.quotaId ?? null,
      supplierId: payable.supplierId ?? null,
      description: payable.description ?? null,
      currency: payable.currency,
      amountTotal: payable.amountTotal,
      amountPaid: payable.amountPaid,
      amountPending: payable.amountPending,
      dueDate: payable.dueDate ?? null,
      status: payable.status,
      createdByUserId: payable.createdByUserId ?? null,
      createdAt: payable.createdAt,
      updatedAt: payable.updatedAt,
    });
    return this.toDomain(await repo.save(row));
  }

  async findById(accountPayableId: string, tx?: TransactionContext): Promise<AccountPayable | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: accountPayableId } });
    return row ? this.toDomain(row) : null;
  }

  async findByPurchaseAndQuota(
    purchaseId: string,
    quotaId?: string,
    tx?: TransactionContext,
  ): Promise<AccountPayable | null> {
    const row = await this.getRepo(tx).findOne({ where: { purchaseId, quotaId: quotaId ?? null } });
    return row ? this.toDomain(row) : null;
  }

  async list(
    params: {
      q?: string;
      status?: PayableStatus;
      statuses?: PayableStatus[];
      purchaseId?: string;
      supplierId?: string;
      currency?: CurrencyType;
      dueFrom?: string;
      dueTo?: string;
      amountPendingMin?: number;
      amountPendingMax?: number;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: AccountPayable[]; total: number }> {
    const qb = this.getRepo(tx).createQueryBuilder("ap");
    if (params.q?.trim()) {
      qb.andWhere("(ap.description ILIKE :q OR CAST(ap.purchaseId AS text) ILIKE :q)", {
        q: `%${params.q.trim()}%`,
      });
    }
    if (params.status) qb.andWhere("ap.status = :status", { status: params.status });
    if (params.statuses?.length) qb.andWhere("ap.status IN (:...statuses)", { statuses: params.statuses });
    if (params.purchaseId) qb.andWhere("ap.purchaseId = :purchaseId", { purchaseId: params.purchaseId });
    if (params.supplierId) qb.andWhere("ap.supplierId = :supplierId", { supplierId: params.supplierId });
    if (params.currency) qb.andWhere("ap.currency = :currency", { currency: params.currency });
    if (params.dueFrom) qb.andWhere("ap.dueDate >= :dueFrom", { dueFrom: params.dueFrom });
    if (params.dueTo) qb.andWhere("ap.dueDate <= :dueTo", { dueTo: params.dueTo });
    if (params.amountPendingMin !== undefined) {
      qb.andWhere("ap.amountPending >= :amountPendingMin", { amountPendingMin: params.amountPendingMin });
    }
    if (params.amountPendingMax !== undefined) {
      qb.andWhere("ap.amountPending <= :amountPendingMax", { amountPendingMax: params.amountPendingMax });
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const [rows, total] = await qb
      .orderBy("ap.dueDate", "ASC", "NULLS LAST")
      .addOrderBy("ap.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async markOverdue(now: Date, tx?: TransactionContext): Promise<number> {
    const result = await this.getRepo(tx)
      .createQueryBuilder()
      .update(AccountPayableEntity)
      .set({ status: "OVERDUE" })
      .where("due_date < :today", { today: now.toISOString().slice(0, 10) })
      .andWhere("amount_pending > 0")
      .andWhere("status IN (:...statuses)", { statuses: ["PENDING", "PARTIAL"] })
      .execute();
    return result.affected ?? 0;
  }
}

