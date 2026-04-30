import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrder } from "src/modules/purchases/domain/entities/purchase-order";
import { PurchaseOrderListRecord, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { Money } from "src/shared/value-objets/money.vo";
import { PurchaseOrderEntity } from "../entities/purchase-order.entity";
import { PurchaseOrderMapper } from "../mappers/purchase-order.mapper";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import {
  matchSearchOptionIds,
  PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS,
  PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS,
  PURCHASE_STATUS_SEARCH_OPTIONS,
  PURCHASE_WAIT_TIME_SEARCH_OPTIONS,
  sanitizePurchaseSearchFilters,
} from "src/modules/purchases/application/support/purchase-search.utils";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import {
  PurchaseSearchFields,
  PurchaseSearchOperators,
  PurchaseSearchRule,
  PurchaseWaitTimeStates,
} from "src/modules/purchases/application/dtos/purchase-search/purchase-search-snapshot";

@Injectable()
export class PurchaseOrderTypeormRepository implements PurchaseOrderRepository {
  constructor(
    @InjectRepository(PurchaseOrderEntity)
    private readonly repo: Repository<PurchaseOrderEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PurchaseOrderEntity);
  }

  async findById(poId: string, tx?: TransactionContext): Promise<PurchaseOrder | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: poId } });
    return row ? PurchaseOrderMapper.toDomain(row) : null;
  }

  async create(purchase: PurchaseOrder, tx?: TransactionContext): Promise<PurchaseOrder> {
    const repo = this.getRepo(tx);
    const row = repo.create(PurchaseOrderMapper.toPersistence(purchase));
    const saved = await repo.save(row);
    return PurchaseOrderMapper.toDomain(saved);
  }
  async listAllByStatus(
    status: PurchaseOrderStatus,
    tx?: TransactionContext,
  ): Promise<PurchaseOrder[]> {
    const repo = this.getRepo(tx);

    const rows = await repo.find({
      where: { status },
      order: { createdAt: "DESC" },
    });

    return rows.map((r) => PurchaseOrderMapper.toDomain(r));
  }

  async update(
    params: {
      poId: string;
      supplierId?: string;
      warehouseId?: string;
      documentType?: VoucherDocType;
      serie?: string;
      correlative?: number;
      currency?: CurrencyType;
      paymentForm?: PaymentFormType;
      creditDays?: number;
      numQuotas?: number;
      totalTaxed?: Money;
      totalExempted?: Money;
      totalIgv?: Money;
      purchaseValue?: Money;
      total?: Money;
      note?: string;
      status?: PurchaseOrderStatus;
      expectedAt?: Date;
      dateIssue?: Date;
      dateExpiration?: Date;
      createdAt?: Date;
      imageProdution?: string[];
    },
    tx?: TransactionContext,
  ): Promise<PurchaseOrder | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<PurchaseOrderEntity> = {};

    if (params.supplierId !== undefined) patch.supplierId = params.supplierId;
    if (params.warehouseId !== undefined) patch.warehouseId = params.warehouseId;
    if (params.documentType !== undefined) patch.documentType = params.documentType;
    if (params.serie !== undefined) patch.serie = params.serie;
    if (params.correlative !== undefined) patch.correlative = params.correlative;
    if (params.currency !== undefined) patch.currency = params.currency;
    if (params.paymentForm !== undefined) patch.paymentForm = params.paymentForm;
    if (params.creditDays !== undefined) patch.creditDays = params.creditDays;
    if (params.numQuotas !== undefined) patch.numQuotas = params.numQuotas;
    if (params.totalTaxed !== undefined) patch.totalTaxed = params.totalTaxed.getAmount();
    if (params.totalExempted !== undefined) patch.totalExempted = params.totalExempted.getAmount();
    if (params.totalIgv !== undefined) patch.totalIgv = params.totalIgv.getAmount();
    if (params.purchaseValue !== undefined) patch.purchaseValue = params.purchaseValue.getAmount();
    if (params.total !== undefined) patch.total = params.total.getAmount();
    if (params.note !== undefined) patch.note = params.note;
    if (params.status !== undefined) patch.status = params.status;
    if (params.expectedAt !== undefined) patch.expectedAt = params.expectedAt;
    if (params.dateIssue !== undefined) patch.dateIssue = params.dateIssue;
    if (params.dateExpiration !== undefined) patch.dateExpiration = params.dateExpiration;
    if (params.createdAt !== undefined) patch.createdAt = params.createdAt;
    if (params.imageProdution !== undefined) patch.imageProdution = params.imageProdution;

    await repo.update({ id: params.poId }, patch);
    const updated = await repo.findOne({ where: { id: params.poId } });
    return updated ? PurchaseOrderMapper.toDomain(updated) : null;
  }

  async list(
    params: {
      filters?: PurchaseSearchRule[];
      q?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: PurchaseOrderListRecord[]; total: number; page: number; limit: number }> {
    const repo = this.getRepo(tx);
    const qb = repo
      .createQueryBuilder("po")
      .leftJoin(SupplierEntity, "supplier", `"supplier"."supplier_id" = "po"."supplier_id"`)
      .leftJoin(WarehouseEntity, "warehouse", `"warehouse"."id" = "po"."warehouse_id"`)
      .leftJoin(
        (subQuery) =>
          subQuery
            .select(`"pd"."po_id"`, "po_id")
            .addSelect(`COALESCE(SUM("pd"."amount"), 0)`, "total_paid")
            .from(PaymentDocumentEntity, "pd")
            .groupBy(`"pd"."po_id"`),
        "payment_summary",
        `payment_summary.po_id = "po"."po_id"`,
      )
      .addSelect(`"supplier"."name"`, "supplier_name")
      .addSelect(`"supplier"."last_name"`, "supplier_last_name")
      .addSelect(`"supplier"."trade_name"`, "supplier_trade_name")
      .addSelect(`"supplier"."document_number"`, "supplier_document_number")
      .addSelect(`"warehouse"."name"`, "warehouse_name")
      .addSelect(`COALESCE(payment_summary.total_paid, 0)`, "payment_total_paid");

    const filters = sanitizePurchaseSearchFilters(params.filters);
    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const startParam = `${fieldParam}_start`;
      const endParam = `${fieldParam}_end`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case PurchaseSearchFields.SUPPLIER_ID:
          if (filter.values?.length) {
            qb.andWhere(`"po"."supplier_id" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case PurchaseSearchFields.WAREHOUSE_ID:
          if (filter.values?.length) {
            qb.andWhere(`"po"."warehouse_id" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case PurchaseSearchFields.STATUS:
          if (filter.values?.length) {
            qb.andWhere(`"po"."status" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case PurchaseSearchFields.DOCUMENT_TYPE:
          if (filter.values?.length) {
            qb.andWhere(`"po"."document_type" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case PurchaseSearchFields.PAYMENT_FORM:
          if (filter.values?.length) {
            qb.andWhere(`"po"."payment_form" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case PurchaseSearchFields.NUMBER:
          if (!filter.value) break;
          if (filter.operator === PurchaseSearchOperators.EQ) {
            qb.andWhere(`lower(concat(coalesce("po"."serie", ''), '-', coalesce("po"."correlative"::text, ''))) = lower(:${valueParam})`, {
              [valueParam]: filter.value,
            });
          } else {
            qb.andWhere(`concat(coalesce("po"."serie", ''), '-', coalesce("po"."correlative"::text, '')) ILIKE :${valueParam}`, {
              [valueParam]: `%${filter.value}%`,
            });
          }
          break;
        case PurchaseSearchFields.TOTAL:
        case PurchaseSearchFields.TOTAL_PAID:
        case PurchaseSearchFields.TOTAL_TO_PAY: {
          if (!filter.value) break;
          const numericExpression =
            filter.field === PurchaseSearchFields.TOTAL
              ? `"po"."total"`
              : filter.field === PurchaseSearchFields.TOTAL_PAID
                ? `COALESCE(payment_summary.total_paid, 0)`
                : `("po"."total" - COALESCE(payment_summary.total_paid, 0))`;

          const sqlOperator =
            filter.operator === PurchaseSearchOperators.GT ? ">" :
            filter.operator === PurchaseSearchOperators.GTE ? ">=" :
            filter.operator === PurchaseSearchOperators.LT ? "<" :
            filter.operator === PurchaseSearchOperators.LTE ? "<=" :
            "=";

          qb.andWhere(`${numericExpression} ${sqlOperator} :${valueParam}`, {
            [valueParam]: Number(filter.value),
          });
          break;
        }
        case PurchaseSearchFields.DATE_ISSUE:
        case PurchaseSearchFields.EXPECTED_AT: {
          const dateExpression =
            filter.field === PurchaseSearchFields.DATE_ISSUE
              ? `DATE("po"."date_issue")`
              : `DATE("po"."expected_at")`;

          if (filter.operator === PurchaseSearchOperators.BETWEEN) {
            if (!filter.range?.start || !filter.range?.end) break;
            qb.andWhere(`${dateExpression} BETWEEN :${startParam} AND :${endParam}`, {
              [startParam]: filter.range.start,
              [endParam]: filter.range.end,
            });
            break;
          }

          if (!filter.value) break;
          const sqlOperator =
            filter.operator === PurchaseSearchOperators.BEFORE ? "<" :
            filter.operator === PurchaseSearchOperators.AFTER ? ">" :
            filter.operator === PurchaseSearchOperators.ON_OR_BEFORE ? "<=" :
            filter.operator === PurchaseSearchOperators.ON_OR_AFTER ? ">=" :
            "=";

          qb.andWhere(`${dateExpression} ${sqlOperator} :${valueParam}`, {
            [valueParam]: filter.value,
          });
          break;
        }
        case PurchaseSearchFields.WAIT_TIME: {
          const statuses = Array.from(new Set((filter.values ?? []).flatMap((value) => {
            switch (value) {
              case PurchaseWaitTimeStates.NOT_STARTED:
                return [PurchaseOrderStatus.DRAFT];
              case PurchaseWaitTimeStates.IN_PROGRESS:
                return [PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIAL];
              case PurchaseWaitTimeStates.COMPLETED:
                return [PurchaseOrderStatus.RECEIVED];
              case PurchaseWaitTimeStates.CANCELLED:
                return [PurchaseOrderStatus.CANCELLED];
              default:
                return [];
            }
          })));

          if (statuses.length) {
            qb.andWhere(`"po"."status" ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: statuses,
            });
          }
          break;
        }
        default:
          break;
      }
    });

    if (params.q) {
      const q = params.q.trim();
      const matchedStatuses = matchSearchOptionIds(q, PURCHASE_STATUS_SEARCH_OPTIONS);
      const matchedDocumentTypes = matchSearchOptionIds(q, PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS);
      const matchedPaymentForms = matchSearchOptionIds(q, PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS);
      const matchedWaitTimes = matchSearchOptionIds(q, PURCHASE_WAIT_TIME_SEARCH_OPTIONS);

      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where(`concat(coalesce("po"."serie", ''), '-', coalesce("po"."correlative"::text, '')) ILIKE :q`, {
              q: `%${q}%`,
            })
            .orWhere(`"supplier"."document_number" ILIKE :q`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("supplier"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("supplier"."last_name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("supplier"."trade_name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`unaccent(coalesce("warehouse"."name", '')) ILIKE unaccent(:q)`, { q: `%${q}%` })
            .orWhere(`"po"."status"::text ILIKE :q`, { q: `%${q}%` })
            .orWhere(`"po"."document_type"::text ILIKE :q`, { q: `%${q}%` })
            .orWhere(`"po"."payment_form"::text ILIKE :q`, { q: `%${q}%` });

          if (matchedStatuses.length) {
            searchQb.orWhere(`"po"."status" IN (:...matchedStatuses)`, { matchedStatuses });
          }

          if (matchedDocumentTypes.length) {
            searchQb.orWhere(`"po"."document_type" IN (:...matchedDocumentTypes)`, { matchedDocumentTypes });
          }

          if (matchedPaymentForms.length) {
            searchQb.orWhere(`"po"."payment_form" IN (:...matchedPaymentForms)`, { matchedPaymentForms });
          }

          if (matchedWaitTimes.length) {
            const waitStatuses = Array.from(new Set(matchedWaitTimes.flatMap((value) => {
              switch (value) {
                case PurchaseWaitTimeStates.NOT_STARTED:
                  return [PurchaseOrderStatus.DRAFT];
                case PurchaseWaitTimeStates.IN_PROGRESS:
                  return [PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIAL];
                case PurchaseWaitTimeStates.COMPLETED:
                  return [PurchaseOrderStatus.RECEIVED];
                case PurchaseWaitTimeStates.CANCELLED:
                  return [PurchaseOrderStatus.CANCELLED];
                default:
                  return [];
              }
            })));

            if (waitStatuses.length) {
              searchQb.orWhere(`"po"."status" IN (:...waitStatuses)`, { waitStatuses });
            }
          }
        }),
      );
    }
    if (params.from) qb.andWhere(`"po"."date_issue" >= :from`, { from: params.from });
    if (params.to) qb.andWhere(`"po"."date_issue" <= :to`, { to: params.to });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const total = await qb.clone().getCount();

    const { entities, raw } = await qb
      .orderBy("po.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const items = entities.map((row, index) => {
      const rawRow = raw[index] ?? {};
      const fullName = [rawRow.supplier_name, rawRow.supplier_last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        order: PurchaseOrderMapper.toDomain(row),
        supplierName: fullName || rawRow.supplier_trade_name || undefined,
        supplierDocumentNumber: rawRow.supplier_document_number || undefined,
        warehouseName: rawRow.warehouse_name || undefined,
        totalPaid: Number(rawRow.payment_total_paid ?? 0),
      };
    });

    return { items, total, page, limit };
  }

  async setActive(poId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: poId }, { isActive });
  }
}
