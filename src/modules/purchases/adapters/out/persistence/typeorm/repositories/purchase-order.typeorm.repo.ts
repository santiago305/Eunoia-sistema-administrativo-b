import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrder } from "src/modules/purchases/domain/entities/purchase-order";
import { PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { Money } from "src/shared/value-objets/money.vo";
import { PurchaseOrderEntity } from "../entities/purchase-order.entity";
import { PurchaseOrderMapper } from "../mappers/purchase-order.mapper";

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
      status?: PurchaseOrderStatus;
      supplierId?: string;
      warehouseId?: string;
      documentType?: VoucherDocType;
      number?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("po");

    if (params.status) qb.andWhere("po.status = :status", { status: params.status });
    if (params.supplierId) qb.andWhere("po.supplierId = :supplierId", { supplierId: params.supplierId });
    if (params.warehouseId) qb.andWhere("po.warehouseId = :warehouseId", { warehouseId: params.warehouseId });
    if (params.documentType) qb.andWhere("po.documentType = :documentType", { documentType: params.documentType });
    if (params.number) {
      const number = params.number.trim();
      qb.andWhere("concat(coalesce(po.serie, ''), '-', coalesce(po.correlative::text, '')) ILIKE :number", {
        number: `%${number}%`,
      });
    }
    if (params.from) qb.andWhere("po.dateIssue >= :from", { from: params.from });
    if (params.to) qb.andWhere("po.dateIssue <= :to", { to: params.to });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [rows, total] = await qb
      .orderBy("po.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => PurchaseOrderMapper.toDomain(r)), total, page, limit };
  }

  async setActive(poId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: poId }, { isActive });
  }
}
