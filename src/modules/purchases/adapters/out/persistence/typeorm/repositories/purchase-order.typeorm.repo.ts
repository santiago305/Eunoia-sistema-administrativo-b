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
} from "src/modules/purchases/application/support/purchase-search.utils";

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

    await repo.update({ id: params.poId }, patch);
    const updated = await repo.findOne({ where: { id: params.poId } });
    return updated ? PurchaseOrderMapper.toDomain(updated) : null;
  }

  async list(
    params: {
      statuses?: PurchaseOrderStatus[];
      supplierIds?: string[];
      warehouseIds?: string[];
      documentTypes?: VoucherDocType[];
      paymentForms?: PaymentFormType[];
      number?: string;
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
      .addSelect(`"supplier"."name"`, "supplier_name")
      .addSelect(`"supplier"."last_name"`, "supplier_last_name")
      .addSelect(`"supplier"."trade_name"`, "supplier_trade_name")
      .addSelect(`"supplier"."document_number"`, "supplier_document_number")
      .addSelect(`"warehouse"."name"`, "warehouse_name");

    if (params.statuses?.length) qb.andWhere(`"po"."status" IN (:...statuses)`, { statuses: params.statuses });
    if (params.supplierIds?.length) qb.andWhere(`"po"."supplier_id" IN (:...supplierIds)`, { supplierIds: params.supplierIds });
    if (params.warehouseIds?.length) qb.andWhere(`"po"."warehouse_id" IN (:...warehouseIds)`, { warehouseIds: params.warehouseIds });
    if (params.documentTypes?.length) qb.andWhere(`"po"."document_type" IN (:...documentTypes)`, { documentTypes: params.documentTypes });
    if (params.paymentForms?.length) qb.andWhere(`"po"."payment_form" IN (:...paymentForms)`, { paymentForms: params.paymentForms });
    if (params.number) {
      const number = params.number.trim();
      qb.andWhere(`concat(coalesce("po"."serie", ''), '-', coalesce("po"."correlative"::text, '')) ILIKE :number`, {
        number: `%${number}%`,
      });
    }
    if (params.q) {
      const q = params.q.trim();
      const matchedStatuses = matchSearchOptionIds(q, PURCHASE_STATUS_SEARCH_OPTIONS);
      const matchedDocumentTypes = matchSearchOptionIds(q, PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS);
      const matchedPaymentForms = matchSearchOptionIds(q, PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS);

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
      };
    });

    return { items, total, page, limit };
  }

  async setActive(poId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: poId }, { isActive });
  }
}
