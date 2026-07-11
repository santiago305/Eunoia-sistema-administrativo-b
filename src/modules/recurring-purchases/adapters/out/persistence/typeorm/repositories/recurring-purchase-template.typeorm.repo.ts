import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { RecurringPurchaseTemplate } from "src/modules/recurring-purchases/domain/entity/recurring-purchase-template";
import {
  RecurringPurchaseTemplateListParams,
  RecurringPurchaseTemplateRepository,
} from "src/modules/recurring-purchases/domain/ports/recurring-purchase-template.repository";
import { RecurringStatus } from "src/modules/recurring-purchases/domain/value-objects/recurring-status";
import {
  RecurringPurchaseSearchFields,
  RecurringPurchaseSearchOperators,
  RecurringPurchaseSearchRule,
} from "src/modules/recurring-purchases/application/dtos/recurring-purchase-search/recurring-purchase-search-snapshot";
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

  async list(params: RecurringPurchaseTemplateListParams, tx?: TransactionContext) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const qb = this.getRepo(tx).createQueryBuilder("template");
    qb.leftJoin(
      "accounts_payable",
      "payable",
      "payable.account_payable_id = template.last_generated_account_payable_id",
    );

    if (params.status) qb.andWhere("template.status = :status", { status: params.status });
    if (params.statuses?.length) qb.andWhere("template.status IN (:...statuses)", { statuses: params.statuses });
    if (params.supplierId) qb.andWhere("template.supplierId = :supplierId", { supplierId: params.supplierId });
    if (params.supplierIds?.length) {
      qb.andWhere("template.supplierId IN (:...supplierIds)", { supplierIds: params.supplierIds });
    }
    if (params.frequency) qb.andWhere("template.frequency = :frequency", { frequency: params.frequency });
    if (params.frequencies?.length) {
      qb.andWhere("template.frequency IN (:...frequencies)", { frequencies: params.frequencies });
    }
    if (params.currency) qb.andWhere("template.currency = :currency", { currency: params.currency });
    if (params.currencies?.length) qb.andWhere("template.currency IN (:...currencies)", { currencies: params.currencies });
    if (params.purchaseType) {
      qb.andWhere("template.purchaseType = :purchaseType", { purchaseType: params.purchaseType });
    }
    if (params.purchaseTypes?.length) {
      qb.andWhere("template.purchaseType IN (:...purchaseTypes)", { purchaseTypes: params.purchaseTypes });
    }

    this.applySmartFilters(qb, params.filters ?? []);

    const q = params.q?.trim();
    if (q) {
      qb.andWhere(
        "(template.name ILIKE :q OR template.description ILIKE :q OR template.status ILIKE :q OR template.frequency ILIKE :q OR template.currency ILIKE :q)",
        { q: `%${q}%` },
      );
    }

    const [rows, total] = await qb
      .orderBy("template.nextDueDate", "ASC")
      .addOrderBy("template.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total, page, limit };
  }

  private applySmartFilters(qb: ReturnType<Repository<RecurringPurchaseTemplateEntity>["createQueryBuilder"]>, filters: RecurringPurchaseSearchRule[]) {
    filters.forEach((filter, index) => {
      const valueParam = `filter_${index}_value`;
      const valuesParam = `filter_${index}_values`;
      const startParam = `filter_${index}_start`;
      const endParam = `filter_${index}_end`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case RecurringPurchaseSearchFields.SUPPLIER_ID:
          if (filter.values?.length) {
            qb.andWhere(`template.supplierId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case RecurringPurchaseSearchFields.STATUS:
          if (filter.values?.length) {
            qb.andWhere(`template.status ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case RecurringPurchaseSearchFields.FREQUENCY:
          if (filter.values?.length) {
            qb.andWhere(`template.frequency ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case RecurringPurchaseSearchFields.PURCHASE_TYPE:
          if (filter.values?.length) {
            qb.andWhere(`template.purchaseType ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case RecurringPurchaseSearchFields.CURRENCY:
          if (filter.values?.length) {
            qb.andWhere(`template.currency ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case RecurringPurchaseSearchFields.PAYMENT_STATUS:
          if (filter.values?.length) {
            qb.andWhere(`payable.status ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case RecurringPurchaseSearchFields.AMOUNT:
          this.applyNumberFilter(qb, "template.amount", filter, valueParam);
          break;
        case RecurringPurchaseSearchFields.START_DATE:
          this.applyDateFilter(qb, "template.startDate", filter, valueParam, startParam, endParam);
          break;
        case RecurringPurchaseSearchFields.NEXT_DUE_DATE:
          this.applyDateFilter(qb, "template.nextDueDate", filter, valueParam, startParam, endParam);
          break;
        default:
          break;
      }
    });
  }

  private applyNumberFilter(
    qb: ReturnType<Repository<RecurringPurchaseTemplateEntity>["createQueryBuilder"]>,
    column: string,
    filter: RecurringPurchaseSearchRule,
    valueParam: string,
  ) {
    if (!filter.value) return;
    const numericValue = Number(filter.value);
    if (!Number.isFinite(numericValue)) return;
    const operator = this.numberOperator(filter.operator);
    if (!operator) return;
    qb.andWhere(`${column} ${operator} :${valueParam}`, { [valueParam]: numericValue });
  }

  private applyDateFilter(
    qb: ReturnType<Repository<RecurringPurchaseTemplateEntity>["createQueryBuilder"]>,
    column: string,
    filter: RecurringPurchaseSearchRule,
    valueParam: string,
    startParam: string,
    endParam: string,
  ) {
    if (filter.operator === RecurringPurchaseSearchOperators.BETWEEN) {
      if (!filter.range?.start || !filter.range?.end) return;
      qb.andWhere(`${column} BETWEEN :${startParam} AND :${endParam}`, {
        [startParam]: filter.range.start,
        [endParam]: filter.range.end,
      });
      return;
    }

    if (!filter.value) return;
    const operator = this.dateOperator(filter.operator);
    if (!operator) return;
    qb.andWhere(`${column} ${operator} :${valueParam}`, { [valueParam]: filter.value });
  }

  private numberOperator(operator: RecurringPurchaseSearchRule["operator"]) {
    if (operator === RecurringPurchaseSearchOperators.GT) return ">";
    if (operator === RecurringPurchaseSearchOperators.GTE) return ">=";
    if (operator === RecurringPurchaseSearchOperators.LT) return "<";
    if (operator === RecurringPurchaseSearchOperators.LTE) return "<=";
    if (operator === RecurringPurchaseSearchOperators.EQ) return "=";
    return null;
  }

  private dateOperator(operator: RecurringPurchaseSearchRule["operator"]) {
    if (operator === RecurringPurchaseSearchOperators.BEFORE) return "<";
    if (operator === RecurringPurchaseSearchOperators.AFTER) return ">";
    if (operator === RecurringPurchaseSearchOperators.ON_OR_BEFORE) return "<=";
    if (operator === RecurringPurchaseSearchOperators.ON_OR_AFTER) return ">=";
    if (operator === RecurringPurchaseSearchOperators.ON || operator === RecurringPurchaseSearchOperators.EQ) return "=";
    return null;
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
