import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { RecurringPurchaseTemplate } from "src/modules/recurring-purchases/domain/entity/recurring-purchase-template";
import { RecurringPurchaseTemplateRepository } from "src/modules/recurring-purchases/domain/ports/recurring-purchase-template.repository";
import { RecurringStatus } from "src/modules/recurring-purchases/domain/value-objects/recurring-status";
import { RecurringPurchaseTemplateEntity } from "../entities/recurring-purchase-template.entity";

@Injectable()
export class RecurringPurchaseTemplateTypeormRepository implements RecurringPurchaseTemplateRepository {
  constructor(
    @InjectRepository(RecurringPurchaseTemplateEntity)
    private readonly repo: Repository<RecurringPurchaseTemplateEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(RecurringPurchaseTemplateEntity);
  }

  private toDomain(row: RecurringPurchaseTemplateEntity) {
    return RecurringPurchaseTemplate.create({
      recurringPurchaseTemplateId: row.id,
      supplierId: row.supplierId,
      name: row.name,
      description: row.description ?? undefined,
      frequency: row.frequency,
      purchaseType: row.purchaseType,
      currency: row.currency,
      amount: Number(row.amount),
      startDate: row.startDate,
      nextDueDate: row.nextDueDate,
      billingAnchorDay: row.billingAnchorDay,
      status: row.status,
      reminderDaysBefore: row.reminderDaysBefore,
      createdByUserId: row.createdByUserId ?? undefined,
      lastGeneratedAt: row.lastGeneratedAt ?? undefined,
      lastGeneratedPeriodKey: row.lastGeneratedPeriodKey ?? undefined,
      lastGeneratedPurchaseId: row.lastGeneratedPurchaseId ?? undefined,
      lastGeneratedAccountPayableId: row.lastGeneratedAccountPayableId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toPersistence(template: RecurringPurchaseTemplate): Partial<RecurringPurchaseTemplateEntity> {
    return {
      id: template.recurringPurchaseTemplateId,
      supplierId: template.supplierId,
      name: template.name,
      description: template.description ?? null,
      frequency: template.frequency,
      purchaseType: template.purchaseType,
      currency: template.currency,
      amount: template.amount,
      startDate: template.startDate,
      nextDueDate: template.nextDueDate,
      billingAnchorDay: template.billingAnchorDay,
      status: template.status,
      reminderDaysBefore: template.reminderDaysBefore,
      createdByUserId: template.createdByUserId ?? null,
      lastGeneratedAt: template.lastGeneratedAt ?? null,
      lastGeneratedPeriodKey: template.lastGeneratedPeriodKey ?? null,
      lastGeneratedPurchaseId: template.lastGeneratedPurchaseId ?? null,
      lastGeneratedAccountPayableId: template.lastGeneratedAccountPayableId ?? null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  async create(template: RecurringPurchaseTemplate, tx?: TransactionContext) {
    const row = this.getRepo(tx).create(this.toPersistence(template));
    return this.toDomain(await this.getRepo(tx).save(row));
  }

  async update(template: RecurringPurchaseTemplate, tx?: TransactionContext) {
    const repo = this.getRepo(tx);
    const row = repo.create(this.toPersistence(template));
    return this.toDomain(await repo.save(row));
  }

  async findById(id: string, tx?: TransactionContext) {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(
    params: { status?: RecurringStatus; page?: number; limit?: number },
    tx?: TransactionContext,
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const qb = this.getRepo(tx).createQueryBuilder("template");
    if (params.status) qb.andWhere("template.status = :status", { status: params.status });

    const [rows, total] = await qb
      .orderBy("template.nextDueDate", "ASC")
      .addOrderBy("template.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total, page, limit };
  }

  async findDueForGeneration(now: Date, tx?: TransactionContext) {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("template")
      .where("template.status = :status", { status: "ACTIVE" })
      .andWhere("template.nextDueDate <= :today", { today: now.toISOString().slice(0, 10) })
      .orderBy("template.nextDueDate", "ASC")
      .getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findDueForReminderWindows(now: Date, windowsDaysBefore: number[], tx?: TransactionContext) {
    const maxWindow = Math.max(
      0,
      ...windowsDaysBefore
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0),
    );
    const today = this.toDateOnly(now);
    const maxDueDate = this.toDateOnly(this.addUtcDays(now, maxWindow));

    const rows = await this.getRepo(tx)
      .createQueryBuilder("template")
      .where("template.status = :status", { status: "ACTIVE" })
      .andWhere("template.nextDueDate BETWEEN :today AND :maxDueDate", { today, maxDueDate })
      .orderBy("template.nextDueDate", "ASC")
      .getMany();
    return rows.map((row) => this.toDomain(row));
  }

  private addUtcDays(date: Date, days: number) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  }

  private toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
