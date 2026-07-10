import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, EntityManager, In, IsNull, Repository, SelectQueryBuilder } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderEntity } from "../entities/sale-order.entity";
import { SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { SourceEntity } from "src/modules/sources/adapters/out/persistence/typeorm/entities/source.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import {
  SaleOrderPaymentStatus,
  SaleOrderPaymentStatusValues,
  SaleOrderListItemOutput,
  SaleOrderSearchFields,
  SaleOrderSearchOperators,
  SaleOrderSearchRule,
} from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import {
  getSaleOrderCalendarWeekRange,
  getSaleOrderMonthRange,
  matchSearchOptionIds,
  SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS,
  sanitizeSaleOrderSearchFilters,
} from "src/modules/sale-orders/application/support/sale-order-search.utils";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { ProductCatalogAttributeEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/attribute.entity";
import { ProductCatalogSkuAttributeValueEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku-attribute-value.entity";
import { SaleOrderGetOutput } from "src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output";
import { SaleOrderItemComponentEntity } from "../entities/sale-order-item-component.entity";
import { SaleOrderItemEntity } from "../entities/sale-order-item.entity";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { WorkflowEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow.entity";
import { WorkflowStateEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-state.entity";
import { TelephoneEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/telephone.entity";
import { SaleOrderStatisticsOutput } from "src/modules/sale-orders/application/dtos/sale-order-statistics.output";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { SaleOrderStatesEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity";
import { UbigeoDepartmentEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-department.entity";
import { UbigeoDistrictEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity";
import { UbigeoProvinceEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity";
import { SaleOrderAttachmentEntity } from "src/modules/sale-order-attachments/adapters/out/persistence/typeorm/entities/sale-order-attachment.entity";
import { SaleOrderAttachmentType } from "src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type";

@Injectable()
export class SaleOrderTypeormRepository implements SaleOrderRepository {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly repo: Repository<SaleOrderEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private async loadSkuAttributes(
    manager: EntityManager,
    skuIds: string[],
  ): Promise<Map<string, Array<{ code: string; name: string | null; value: string }>>> {
    if (!skuIds.length) return new Map();

    const rows = await manager
      .getRepository(ProductCatalogSkuAttributeValueEntity)
      .createQueryBuilder("sav")
      .innerJoin(ProductCatalogAttributeEntity, "a", "a.attribute_id = sav.attribute_id")
      .where("sav.sku_id IN (:...skuIds)", { skuIds })
      .select([
        "sav.sku_id AS sku_id",
        "sav.value AS value",
        "a.code AS code",
        "a.name AS name",
      ])
      .orderBy("a.code", "ASC")
      .getRawMany<{ sku_id: string; code: string; name: string | null; value: string }>();

    const map = new Map<string, Array<{ code: string; name: string | null; value: string }>>();
    for (const row of rows) {
      const list = map.get(row.sku_id) ?? [];
      list.push({
        code: row.code,
        name: row.name ?? null,
        value: row.value,
      });
      map.set(row.sku_id, list);
    }
    return map;
  }

  private toDomain(row: SaleOrderEntity): SaleOrder {
    return new SaleOrder(
      row.id,
      row.serie ?? null,
      row.correlative ?? null,
      row.warehouseId ?? null,
      row.clientId,
      row.agencySubsidiaryId ?? null,
      row.agencyDetail ?? null,
      row.sourceId ?? null,
      row.scheduleDate ?? null,
      row.deliveryDate ?? null,
      Number(row.subTotal ?? 0),
      Number(row.deliveryCost ?? 0),
      Number(row.discount ?? 0),
      Number(row.total ?? 0),
      row.note ?? null,
      row.advertisingCode ?? null,
      row.observation ?? null,
      row.sendDate ?? null,
      row.sendPhoto ?? null,
      row.sendCode ?? null,
      row.sendAddress ?? null,
      row.assignedBy ?? null,
      row.createdBy,
      row.workflowId ?? null,
      row.currentStateId ?? null,
      Boolean(row.isActive),
      row.createdAt,
      row.updatedAt ?? null,
      row.items?.map((item) => ({
        id: item.id,
        saleOrderId: item.saleOrderId,
        referencePackId: item.referencePackId ?? null,
        description: item.description ?? null,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        total: Number(item.total ?? 0),
        createdAt: item.createdAt,
      })) ?? [],
      Boolean(row.invoiceSend),
      Boolean(row.reserveBool),
    );
  }

  async create(input: Parameters<SaleOrderRepository["create"]>[0], tx?: TransactionContext): Promise<SaleOrder> {
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SaleOrderEntity).save({
      serie: input.serie ?? null,
      correlative: input.correlative ?? null,
      warehouseId: input.warehouseId ?? null,
      clientId: input.clientId,
      agencySubsidiaryId: input.agencySubsidiaryId ?? null,
      agencyDetail: input.agencyDetail ?? null,
      sourceId: input.sourceId ?? null,
      scheduleDate: input.scheduleDate ?? null,
      deliveryDate: input.deliveryDate ?? null,
      subTotal: input.subTotal,
      deliveryCost: input.deliveryCost,
      discount: input.discount ?? 0,
      total: input.total,
      note: input.note ?? null,
      advertisingCode: input.advertisingCode ?? null,
      observation: input.observation ?? null,
      sendDate: input.sendDate ?? null,
      sendPhoto: input.sendPhoto ?? null,
      sendCode: input.sendCode ?? null,
      sendAddress: input.sendAddress ?? null,
      assignedBy: input.assignedBy ?? null,
      createdBy: input.createdBy,
      createdAt: input.createdAt ?? undefined,
      workflowId: input.workflowId ?? null,
      currentStateId: input.currentStateId ?? null,
      isActive: input.isActive ?? true,
    });
    if (input.createdAt) {
      await manager.getRepository(SaleOrderEntity).update(
        { id: saved.id },
        { createdAt: input.createdAt },
      );
      saved.createdAt = input.createdAt;
    }
    return this.toDomain(saved);
  }

  async findByIdForUpdate(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrder | null> {
    const manager = this.getManager(tx);
    const row = await manager.getRepository(SaleOrderEntity).findOne({
      where: { id: saleOrderId },
      lock: { mode: "pessimistic_write" },
    });
    return row ? this.toDomain(row) : null;
  }

  async assignWarehouseIfEmpty(
    input: { saleOrderId: string; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<SaleOrder | null> {
    const manager = this.getManager(tx);
    const result = await manager
      .getRepository(SaleOrderEntity)
      .createQueryBuilder()
      .update(SaleOrderEntity)
      .set({ warehouseId: input.warehouseId })
      .where("id = :saleOrderId", { saleOrderId: input.saleOrderId })
      .andWhere("warehouse_id IS NULL")
      .execute();

    return result.affected ? this.findByIdForUpdate(input.saleOrderId, tx) : null;
  }

  async updateAssignedBy(
    input: { saleOrderId: string; assignedBy: string | null },
    tx?: TransactionContext,
  ): Promise<SaleOrder | null> {
    const manager = this.getManager(tx);
    const repo = manager.getRepository(SaleOrderEntity);
    const result = await repo.update(
      { id: input.saleOrderId },
      { assignedBy: input.assignedBy },
    );

    if (!result.affected) {
      return null;
    }

    const row = await repo.findOne({ where: { id: input.saleOrderId } });
    return row ? this.toDomain(row) : null;
  }

  async update(input: Parameters<SaleOrderRepository["update"]>[0], tx?: TransactionContext): Promise<SaleOrder> {
    const manager = this.getManager(tx);
    const repo = manager.getRepository(SaleOrderEntity);

    const row = await repo.findOne({
      where: { id: input.saleOrderId },
      lock: { mode: "pessimistic_write" },
    });
    if (!row) {
      throw new BadRequestException("Pedido no encontrado");
    }

    const saved = await repo.save({
      ...row,
      warehouseId: input.warehouseId ?? null,
      clientId: input.clientId,
      agencySubsidiaryId: input.agencySubsidiaryId ?? null,
      agencyDetail: input.agencyDetail ?? null,
      sourceId: input.sourceId ?? null,
      scheduleDate: input.scheduleDate ?? null,
      deliveryDate: input.deliveryDate ?? null,
      subTotal: input.subTotal,
      deliveryCost: input.deliveryCost,
      discount: input.discount ?? row.discount ?? 0,
      total: input.total,
      note: input.note ?? null,
      advertisingCode: input.advertisingCode ?? null,
      observation: input.observation ?? null,
      sendDate: input.sendDate ?? row.sendDate ?? null,
      sendPhoto: input.sendPhoto ?? row.sendPhoto ?? null,
      sendCode: input.sendCode ?? row.sendCode ?? null,
      sendAddress: input.sendAddress ?? row.sendAddress ?? null,
      assignedBy: input.assignedBy ?? row.assignedBy ?? null,
      workflowId: input.workflowId ?? row.workflowId ?? null,
      currentStateId: input.currentStateId ?? row.currentStateId ?? null,
    });

    return this.toDomain(saved);
  }
  async countSaleOrdersByClientId(
    clientId: string,
    tx?: TransactionContext,
  ): Promise<number> {
    const manager = this.getManager(tx);
    return manager
      .getRepository(SaleOrderEntity)
      .createQueryBuilder("saleOrder")
      .innerJoin(
        WorkflowStateEntity,
        "state",
        "state.id = saleOrder.currentStateId",
      )
      .where("saleOrder.clientId = :clientId", { clientId })
      .andWhere("saleOrder.isActive = true")
      .andWhere("state.isFinal = true")
      .getCount();
  }

  async markInvoiceSent(saleOrderId: string, tx?: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SaleOrderEntity).update(
      { id: saleOrderId },
      { invoiceSend: true },
    );
  }

  async setReserveBool(input: { saleOrderId: string; reserveBool: boolean }, tx?: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SaleOrderEntity).update(
      { id: input.saleOrderId },
      { reserveBool: input.reserveBool },
    );
  }

  private applyPaymentStatusFilter(
    qb: SelectQueryBuilder<SaleOrderEntity>,
    filter: SaleOrderSearchRule,
    valuesParam: string,
  ) {
    if (!filter.values?.length) return;
    const normalized = filter.values.filter(
      (v) => v === SaleOrderPaymentStatusValues.PAID || v === SaleOrderPaymentStatusValues.PENDING,
    );
    if (!normalized.length) return;

    const comparator = filter.mode === "exclude" ? "NOT IN" : "IN";

    const statusSql = this.paymentStatusSql();

    qb.andWhere(`${statusSql} ${comparator} (:...${valuesParam})`, { [valuesParam]: normalized });
  }

  private paymentStatusSql() {
    const paymentsSumSql = "(SELECT COALESCE(SUM(sp.amount), 0) FROM sale_payments sp WHERE sp.sale_order_id = so.id)";
    return `CASE WHEN ${paymentsSumSql} >= so.total THEN '${SaleOrderPaymentStatusValues.PAID}' ELSE '${SaleOrderPaymentStatusValues.PENDING}' END`;
  }

  private parseLocalDateBoundary(value: string | undefined, addDays = 0): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    if (addDays) {
      date.setUTCDate(date.getUTCDate() + addDays);
    }

    return `${date.toISOString().slice(0, 10)} 00:00:00`;
  }

  private applyCreatedAtDateFilter(
    qb: SelectQueryBuilder<SaleOrderEntity>,
    filter: SaleOrderSearchRule,
    valueParam: string,
    rangeStartParam: string,
    rangeEndParam: string,
  ) {
    const applyClosedDayRange = (startValue: string | undefined, endValue: string | undefined) => {
      const start = this.parseLocalDateBoundary(startValue);
      const endExclusive = this.parseLocalDateBoundary(endValue, 1);
      if (!start || !endExclusive) return;
      qb.andWhere(`so.createdAt >= :${rangeStartParam} AND so.createdAt < :${rangeEndParam}`, {
        [rangeStartParam]: start,
        [rangeEndParam]: endExclusive,
      });
    };

    if (filter.operator === SaleOrderSearchOperators.BETWEEN) {
      applyClosedDayRange(filter.range?.start, filter.range?.end);
      return;
    }

    if (filter.operator === SaleOrderSearchOperators.IN_MONTH) {
      const range = getSaleOrderMonthRange(filter.value);
      if (range) applyClosedDayRange(range.start, range.end);
      return;
    }

    if (filter.operator === SaleOrderSearchOperators.IN_WEEK) {
      const range = getSaleOrderCalendarWeekRange(filter.value);
      if (range) applyClosedDayRange(range.start, range.end);
      return;
    }

    if (!filter.value) return;

    const start = this.parseLocalDateBoundary(filter.value);
    const endExclusive = this.parseLocalDateBoundary(filter.value, 1);
    if (!start || !endExclusive) return;

    switch (filter.operator) {
      case SaleOrderSearchOperators.ON:
        qb.andWhere(`so.createdAt >= :${rangeStartParam} AND so.createdAt < :${rangeEndParam}`, {
          [rangeStartParam]: start,
          [rangeEndParam]: endExclusive,
        });
        return;
      case SaleOrderSearchOperators.BEFORE:
        qb.andWhere(`so.createdAt < :${valueParam}`, { [valueParam]: start });
        return;
      case SaleOrderSearchOperators.AFTER:
        qb.andWhere(`so.createdAt >= :${valueParam}`, { [valueParam]: endExclusive });
        return;
      case SaleOrderSearchOperators.ON_OR_BEFORE:
        qb.andWhere(`so.createdAt < :${valueParam}`, { [valueParam]: endExclusive });
        return;
      case SaleOrderSearchOperators.ON_OR_AFTER:
        qb.andWhere(`so.createdAt >= :${valueParam}`, { [valueParam]: start });
        return;
      default:
        return;
    }
  }

  private applyDateFilter(
    qb: SelectQueryBuilder<SaleOrderEntity>,
    filter: SaleOrderSearchRule,
    valueParam: string,
    rangeStartParam: string,
    rangeEndParam: string,
  ) {
    if (filter.field === SaleOrderSearchFields.CREATED_AT) {
      this.applyCreatedAtDateFilter(qb, filter, valueParam, rangeStartParam, rangeEndParam);
      return;
    }

    const column = filter.field === SaleOrderSearchFields.SCHEDULE_DATE
      ? "so.scheduleDate"
      : "so.deliveryDate";

    if (filter.operator === SaleOrderSearchOperators.BETWEEN) {
      const start = filter.range?.start;
      const end = filter.range?.end;
      if (!start || !end) return;
      qb.andWhere(`${column} BETWEEN :${rangeStartParam} AND :${rangeEndParam}`, {
        [rangeStartParam]: start,
        [rangeEndParam]: end,
      });
      return;
    }

    if (filter.operator === SaleOrderSearchOperators.IN_MONTH) {
      const range = getSaleOrderMonthRange(filter.value);
      if (!range) return;
      qb.andWhere(`${column} BETWEEN :${rangeStartParam} AND :${rangeEndParam}`, {
        [rangeStartParam]: range.start,
        [rangeEndParam]: range.end,
      });
      return;
    }

    if (filter.operator === SaleOrderSearchOperators.IN_WEEK) {
      const range = getSaleOrderCalendarWeekRange(filter.value);
      if (!range) return;
      qb.andWhere(`${column} BETWEEN :${rangeStartParam} AND :${rangeEndParam}`, {
        [rangeStartParam]: range.start,
        [rangeEndParam]: range.end,
      });
      return;
    }

    if (!filter.value) return;

    switch (filter.operator) {
      case SaleOrderSearchOperators.ON:
        qb.andWhere(`${column} = :${valueParam}`, { [valueParam]: filter.value });
        return;
      case SaleOrderSearchOperators.BEFORE:
        qb.andWhere(`${column} < :${valueParam}`, { [valueParam]: filter.value });
        return;
      case SaleOrderSearchOperators.AFTER:
        qb.andWhere(`${column} > :${valueParam}`, { [valueParam]: filter.value });
        return;
      case SaleOrderSearchOperators.ON_OR_BEFORE:
        qb.andWhere(`${column} <= :${valueParam}`, { [valueParam]: filter.value });
        return;
      case SaleOrderSearchOperators.ON_OR_AFTER:
        qb.andWhere(`${column} >= :${valueParam}`, { [valueParam]: filter.value });
        return;
      default:
        return;
    }
  }
  async updateWorkflowState(
  input: {
    saleOrderId: string;
    workflowId?: string | null;
    currentStateId?: string | null;
  },
    tx?: TransactionContext,
  ): Promise<SaleOrder> {
    const manager = this.getManager(tx);
    const repo = manager.getRepository(SaleOrderEntity);
    const row = await repo.findOne({
      where: { id: input.saleOrderId },
    });
    if (!row) {
      throw new Error("Pedido no encontrado");
    }
    if (input.workflowId !== undefined) {
      row.workflowId = input.workflowId;
    }
    if (input.currentStateId !== undefined) {
      row.currentStateId = input.currentStateId;
    }
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  private automaticWorkflowCandidatesQuery(manager: EntityManager): SelectQueryBuilder<SaleOrderEntity> {
    return manager
      .getRepository(SaleOrderEntity)
      .createQueryBuilder("so")
      .select("so.id", "id")
      .addSelect("so.createdAt", "createdAt")
      .innerJoin(
        WorkflowStateEntity,
        "currentState",
        "currentState.id = so.currentStateId",
      )
      .innerJoin(
        SaleOrderStatesEntity,
        "globalState",
        "globalState.id = currentState.saleOrderStateId",
      )
      .innerJoin(
        "workflow_transitions",
        "wt",
        "wt.workflow_id = so.workflow_id AND (wt.is_global = true OR wt.from_state_id = so.current_state_id)",
      )
      .where("so.workflow_id IS NOT NULL")
      .andWhere("so.current_state_id IS NOT NULL")
      .andWhere("currentState.isFinal = false")
      .andWhere("upper(globalState.code) <> :cancelledCode", {
        cancelledCode: "CANCELLED",
      })
      .andWhere("wt.auto_trigger = true")
      .andWhere("wt.is_active = true");
  }

  async listIdsForAutomaticWorkflow(limit = 500, tx?: TransactionContext): Promise<string[]> {
    const manager = this.getManager(tx);
    const rows = await this.automaticWorkflowCandidatesQuery(manager)
      .distinct(true)
      .orderBy("so.created_at", "ASC")
      .limit(limit)
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  async listIdsForAutomaticWorkflowByClientId(
    clientId: string,
    limit = 100,
    tx?: TransactionContext,
  ): Promise<string[]> {
    const manager = this.getManager(tx);
    const rows = await this.automaticWorkflowCandidatesQuery(manager)
      .andWhere("so.client_id = :clientId", { clientId })
      .distinct(true)
      .orderBy("so.created_at", "ASC")
      .limit(limit)
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  async listIdsForAutomaticWorkflowByInventoryStockEvent(
    input: { warehouseId: string; stockItemId: string },
    limit = 100,
    tx?: TransactionContext,
  ): Promise<string[]> {
    const manager = this.getManager(tx);
    const rows = await this.automaticWorkflowCandidatesQuery(manager)
      .innerJoin(SaleOrderItemEntity, "inventoryItem", "inventoryItem.sale_order_id = so.id")
      .innerJoin(
        SaleOrderItemComponentEntity,
        "inventoryComponent",
        "inventoryComponent.sale_order_item_id = inventoryItem.id",
      )
      .innerJoin(
        ProductCatalogStockItemEntity,
        "inventoryStockItem",
        "inventoryStockItem.sku_id = inventoryComponent.sku_id",
      )
      .andWhere("so.warehouse_id = :warehouseId", { warehouseId: input.warehouseId })
      .andWhere("inventoryStockItem.stock_item_id = :stockItemId", { stockItemId: input.stockItemId })
      .distinct(true)
      .orderBy("so.created_at", "ASC")
      .limit(limit)
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  async list(
    params: { q?: string; filters?: SaleOrderSearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: SaleOrderListItemOutput[]; total: number }> {
    const manager = this.getManager(tx);
    const qb = manager.getRepository(SaleOrderEntity)
      .createQueryBuilder("so")
      .leftJoinAndSelect("so.items", "items");

    const q = params.q?.trim();
    if (q) {
      qb
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(WarehouseEntity, "warehouse", "warehouse.id = so.warehouseId")
        .leftJoin(SourceEntity, "source", "source.id = so.sourceId")
        .leftJoin(User, "creator", "creator.id = so.createdBy")

      const matchedPaymentStatuses = matchSearchOptionIds(q, SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS);

      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where("concat(coalesce(so.serie, ''), '-', coalesce(so.correlative::text, '')) ILIKE :q", {
              q: `%${q}%`,
            })
            .orWhere("unaccent(coalesce(so.agencyDetail, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(so.note, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(so.advertisingCode, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(so.observation, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(client.fullName, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(client.docNumber, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(warehouse.name, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(source.name, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(source.detail, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(creator.name, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(creator.email, '')) ILIKE unaccent(:q)", { q: `%${q}%` });

          if (matchedPaymentStatuses.length) {
            searchQb.orWhere(`${this.paymentStatusSql()} IN (:...matchedPaymentStatuses)`, { matchedPaymentStatuses });
          }

        }),
      );
    }

    const filters = sanitizeSaleOrderSearchFilters(params.filters ?? []);
    filters.forEach((filter, index) => {
      const valueParam = `filter_${index}_value`;
      const rangeStartParam = `filter_${index}_range_start`;
      const rangeEndParam = `filter_${index}_range_end`;

      switch (filter.field) {
        case SaleOrderSearchFields.NUMBER: {
          if (!filter.value) break;
          const raw = filter.value.trim();
          if (!raw) break;

          if (filter.operator === SaleOrderSearchOperators.EQ) {
            const exact = raw.replace(/\s+/g, " ").trim();
            const match = /^([A-Za-z0-9]+)\s*[-\s]\s*(\d+)$/.exec(exact);
            if (match) {
              qb.andWhere("unaccent(coalesce(so.serie, '')) = unaccent(:serie)", { serie: match[1] });
              qb.andWhere("so.correlative = :correlative", { correlative: Number(match[2]) });
              break;
            }

            if (/^\d+$/.test(exact)) {
              qb.andWhere("so.correlative = :correlative", { correlative: Number(exact) });
              break;
            }

            qb.andWhere("unaccent(coalesce(so.serie, '')) = unaccent(:serie)", { serie: exact });
            break;
          }

          qb.andWhere(
            new Brackets((searchQb) => {
              searchQb
                .where("concat(coalesce(so.serie, ''), '-', coalesce(so.correlative::text, '')) ILIKE :num", {
                  num: `%${raw}%`,
                })
                .orWhere("unaccent(coalesce(so.serie, '')) ILIKE unaccent(:num)", { num: `%${raw}%` })
                .orWhere("CAST(so.correlative AS text) ILIKE :num", { num: `%${raw}%` });
            }),
          );
          break;
        }
        case SaleOrderSearchFields.CLIENT_ID:
          if (filter.values?.length) {
            qb.andWhere(`so.clientId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.CREATED_BY:
          if (filter.values?.length) {
            qb.andWhere(`so.createdBy ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.ASSIGNED_BY:
          if (filter.values?.length) {
            qb.andWhere(`so.assignedBy ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.WAREHOUSE_ID:
          if (filter.values?.length) {
            qb.andWhere(`so.warehouseId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.WORKFLOW_ID:
          if (filter.values?.length) {
            qb.andWhere(`so.workflowId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.SALE_ORDER_STATE_ID:
          if (filter.values?.length) {
            qb.leftJoin(WorkflowStateEntity, "filterState", "filterState.id = so.currentStateId");
            qb.andWhere(`filterState.saleOrderStateId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.BANK_ACCOUNT_ID:
          if (filter.values?.length) {
            qb.leftJoin(SalePaymentEntity, "filterPayment", "filterPayment.saleOrderId = so.id");
            qb.andWhere(`filterPayment.bankAccountId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.CLIENT_TYPE:
          if (filter.values?.length) {
            qb.leftJoin(ClientEntity, "filterClient", "filterClient.id = so.clientId");
            qb.andWhere(`filterClient.type ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.PAYMENT_STATUS:
          this.applyPaymentStatusFilter(qb, filter, valueParam);
          break;
        case SaleOrderSearchFields.CLIENT_DEPARTMENT_ID:
        case SaleOrderSearchFields.CLIENT_PROVINCE_ID:
        case SaleOrderSearchFields.CLIENT_DISTRICT_ID:
          if (filter.values?.length) {
            qb.leftJoin(ClientEntity, "filterUbigeoClient", "filterUbigeoClient.id = so.clientId");
            const column = filter.field === SaleOrderSearchFields.CLIENT_DEPARTMENT_ID
              ? "filterUbigeoClient.departmentId"
              : filter.field === SaleOrderSearchFields.CLIENT_PROVINCE_ID
                ? "filterUbigeoClient.provinceId"
                : "filterUbigeoClient.districtId";
            qb.andWhere(`${column} ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.SOURCE_ID:
          if (filter.values?.length) {
            qb.andWhere(`so.sourceId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.INVOICE_STATUS:
          if (filter.values?.length) {
            const sentValues = filter.values.map((value) => value === "SENT");
            qb.andWhere(`so.invoiceSend ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: sentValues,
            });
          }
          break;
        case SaleOrderSearchFields.SCHEDULE_DATE:
        case SaleOrderSearchFields.DELIVERY_DATE:
        case SaleOrderSearchFields.CREATED_AT:
          this.applyDateFilter(qb, filter, valueParam, rangeStartParam, rangeEndParam);
          break;
        case SaleOrderSearchFields.ADVERTISING_CODE:
        case SaleOrderSearchFields.OBSERVATION:
        case SaleOrderSearchFields.AGENCY_DETAIL:
        case SaleOrderSearchFields.CLIENT_PHONE: {
          if (!filter.value) break;
          let column = "so.observation";
          if (filter.field === SaleOrderSearchFields.ADVERTISING_CODE) column = "so.advertisingCode";
          if (filter.field === SaleOrderSearchFields.AGENCY_DETAIL) column = "so.agencyDetail";
          if (filter.field === SaleOrderSearchFields.CLIENT_PHONE) {
            qb.leftJoin(TelephoneEntity, "filterTelephone", "filterTelephone.clientId = so.clientId AND filterTelephone.isActive = true");
            column = "filterTelephone.number";
          }
          const operator = filter.operator === SaleOrderSearchOperators.EQ ? "=" : "ILIKE";
          const value = filter.operator === SaleOrderSearchOperators.EQ
            ? filter.value
            : `%${filter.value}%`;
          qb.andWhere(`unaccent(coalesce(${column}, '')) ${operator} unaccent(:${valueParam})`, {
            [valueParam]: value,
          });
          break;
        }
        default:
          break;
      }
    });
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const [rows, total] = await qb
      .orderBy("so.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (!rows.length) return { items: [], total };

    const saleOrderIds = rows.map((row) => row.id);
    const clientIds = Array.from(new Set(rows.map((row) => row.clientId).filter(Boolean))) as string[];
    const warehouseIds = Array.from(new Set(rows.map((row) => row.warehouseId).filter(Boolean))) as string[];
    const sourceIds = Array.from(new Set(rows.map((row) => row.sourceId).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.flatMap((row) => [row.createdBy, row.assignedBy]).filter(Boolean))) as string[];
    const workflowIds = Array.from(new Set(rows.map((row) => row.workflowId).filter(Boolean))) as string[];
    const stateIds = Array.from(new Set(rows.map((row) => row.currentStateId).filter(Boolean))) as string[];

    const [payments, clients, mainTelephones, warehouses, sources, users, workflows, states] = await Promise.all([
      manager.getRepository(SalePaymentEntity).find({
        where: { saleOrderId: In(saleOrderIds) },
        order: { createdAt: "ASC" },
      }),
      clientIds.length
        ? manager.getRepository(ClientEntity).find({ where: { id: In(clientIds) } })
        : Promise.resolve([]),
      clientIds.length
        ? manager.getRepository(TelephoneEntity).find({
            where: { clientId: In(clientIds), isMain: true, isActive: true },
          })
        : Promise.resolve([]),
      warehouseIds.length
        ? manager.getRepository(WarehouseEntity).find({ where: { id: In(warehouseIds) } })
        : Promise.resolve([]),
      sourceIds.length
        ? manager.getRepository(SourceEntity).find({ where: { id: In(sourceIds) } })
        : Promise.resolve([]),
      userIds.length
        ? manager.getRepository(User).find({ where: { id: In(userIds) } })
        : Promise.resolve([]),
      workflowIds.length
        ? manager.getRepository(WorkflowEntity).find({ where: { id: In(workflowIds) } })
        : Promise.resolve([]),
      stateIds.length
        ? manager.getRepository(WorkflowStateEntity).find({
            where: { id: In(stateIds) },
            relations: { saleOrderState: true },
          })
        : Promise.resolve([]),
    ]);
    const departmentIds = Array.from(
      new Set(clients.map((client) => client.departmentId).filter(Boolean)),
    ) as string[];
    const provinceIds = Array.from(
      new Set(clients.map((client) => client.provinceId).filter(Boolean)),
    ) as string[];
    const districtIds = Array.from(
      new Set(clients.map((client) => client.districtId).filter(Boolean)),
    ) as string[];

    const [departments, provinces, districts] = await Promise.all([
      departmentIds.length
        ? manager.getRepository(UbigeoDepartmentEntity).find({
            where: { id: In(departmentIds) },
          })
        : Promise.resolve([]),
      provinceIds.length
        ? manager.getRepository(UbigeoProvinceEntity).find({
            where: { id: In(provinceIds) },
          })
        : Promise.resolve([]),
      districtIds.length
        ? manager.getRepository(UbigeoDistrictEntity).find({
            where: { id: In(districtIds) },
          })
        : Promise.resolve([]),
    ]);

    const bankAccountIds = Array.from(new Set(payments.map((p) => p.bankAccountId).filter(Boolean))) as string[];
    const bankAccounts = bankAccountIds.length
      ? await manager.getRepository(CompanyPaymentAccountEntity).find({ where: { id: In(bankAccountIds) } })
      : [];

    const clientById = new Map(clients.map((row) => [row.id, row]));
    const mainTelephoneByClientId = new Map(mainTelephones.map((row) => [row.clientId, row.number]));
    const departmentById = new Map(departments.map((row) => [row.id, row]));
    const provinceById = new Map(provinces.map((row) => [row.id, row]));
    const districtById = new Map(districts.map((row) => [row.id, row]));
    
    const warehouseById = new Map(warehouses.map((row) => [row.id, row]));
    const sourceById = new Map(sources.map((row) => [row.id, row]));
    const userById = new Map(users.map((row) => [row.id, row]));
    const bankAccountById = new Map(bankAccounts.map((row) => [row.id, row]));
    const workflowById = new Map(workflows.map((row) => [row.id, row]));
    const stateById = new Map(states.map((row) => [row.id, row]));

    const paymentsByOrderId = new Map<string, SalePaymentEntity[]>();
    for (const payment of payments) {
      const list = paymentsByOrderId.get(payment.saleOrderId) ?? [];
      list.push(payment);
      paymentsByOrderId.set(payment.saleOrderId, list);
    }

    const toIso = (date: Date) => date.toISOString();

    const items: SaleOrderListItemOutput[] = await Promise.all(
    rows.map(async (row) => {
      const orderPayments = paymentsByOrderId.get(row.id) ?? [];
      const totalPaid = orderPayments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
      const totalOrder = Number(row.total ?? 0);
      const pendingAmount = Math.max(totalOrder - totalPaid, 0);
      const paymentStatus: SaleOrderPaymentStatus = totalPaid >= totalOrder ? "PAID" : "PENDING";

      const client = clientById.get(row.clientId);
      const warehouse = warehouseById.get(row.warehouseId);
      const source = row.sourceId ? sourceById.get(row.sourceId) : undefined;
      const creator = userById.get(row.createdBy);
      const assignedUser = row.assignedBy ? userById.get(row.assignedBy) : undefined;
      const workflow = row.workflowId ? workflowById.get(row.workflowId) : undefined;
      const currentState = row.currentStateId ? stateById.get(row.currentStateId) : undefined;

      return {
        id: row.id,
        serie: row.serie ?? null,
        correlative: row.correlative ?? null,
        warehouse: warehouse ? { id: warehouse.id, name: warehouse.name } : null,
        client: client
          ? {
              id: client.id,
              type: client.type,
              docType: client.docType,
              fullName: client.fullName,
              docNumber: client.docNumber ?? null,
              reference: client.reference ?? null,
              mainPhone: mainTelephoneByClientId.get(client.id) ?? null,
              count: await this.countSaleOrdersByClientId(client.id, tx),
              department: client.departmentId
                ? (() => {
                    const department = departmentById.get(client.departmentId);
                    return department ? { id: department.id, name: department.name } : null;
                  })()
                : null,
              province: client.provinceId
                ? (() => {
                    const province = provinceById.get(client.provinceId);
                    return province
                      ? { id: province.id, name: province.name, departmentId: province.departmentId }
                      : null;
                  })()
                : null,
              district: client.districtId
                ? (() => {
                    const district = districtById.get(client.districtId);
                    return district
                      ? { id: district.id, name: district.name, provinceId: district.provinceId }
                      : null;
                  })()
                : null,
              isActive: client.isActive
            }
          : null,
        agencySubsidiaryId: row.agencySubsidiaryId ?? null,
        agencyDetail: row.agencyDetail ?? null,
        source: source ? { id: source.id, name: source.name, detail: source.detail ?? null } : null,
        scheduleDate: row.scheduleDate ?? null,
        deliveryDate: row.deliveryDate ?? null,
        subTotal: Number(row.subTotal ?? 0),
        deliveryCost: Number(row.deliveryCost ?? 0),
        total: totalOrder,
        note: row.note ?? null,
        advertisingCode: row.advertisingCode ?? null,
        observation: row.observation ?? null,
        assignedBy: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
        createdBy: creator ? { id: creator.id, name: creator.name, email: creator.email } : null,
        workflow: workflow
          ? {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description ?? null,
              isActive: workflow.isActive,
            }
          : null,
        currentState: currentState
          ? {
              id: currentState.id,
              code: currentState.saleOrderState?.code ?? "",
              name: currentState.saleOrderState?.name ?? "",
              color: currentState.saleOrderState?.color ?? "",
              isInitial: currentState.isInitial,
              isFinal: currentState.isFinal,
              isActive: currentState.isActive,
            }
          : null,
        invoiceSend: Boolean(row.invoiceSend),
        reserveBool: Boolean(row.reserveBool),
        isActive: Boolean(row.isActive),
        createdAt: toIso(row.createdAt),
        updatedAt: row.updatedAt ? toIso(row.updatedAt) : null,
        items: (row.items ?? []).map((item) => ({
          id: item.id,
          referencePackId: item.referencePackId ?? null,
          description: item.description ?? null,
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unitPrice ?? 0),
          total: Number(item.total ?? 0),
          createdAt: toIso(item.createdAt),
        })),
        payments: orderPayments.map((p) => ({
          id: p.id,
          bankAccount: p.bankAccountId
            ? (() => {
                const account = bankAccountById.get(p.bankAccountId);
                return account ? { id: account.id, name: account.name, number: account.accountNumber ?? null } : null;
              })()
            : null,
          date: toIso(p.date),
          method: p.method,
          operationNumber: p.operationNumber ?? null,
          amount: Number(p.amount ?? 0),
          note: p.note ?? null,
          createdAt: toIso(p.createdAt),
        })),
        totalPaid,
        pendingAmount,
        paymentStatus,
      };
    }),
  );

  return { items, total };
  }

  async statistics(
    params: { q?: string; filters?: SaleOrderSearchRule[]; includeCancelled?: boolean },
    tx?: TransactionContext,
  ): Promise<SaleOrderStatisticsOutput> {
    const manager = this.getManager(tx);
    const base = manager
      .getRepository(SaleOrderEntity)
      .createQueryBuilder("so")
      .leftJoin(ClientEntity, "client", "client.id = so.clientId")
      .leftJoin(WarehouseEntity, "warehouse", "warehouse.id = so.warehouseId")
      .leftJoin(SourceEntity, "source", "source.id = so.sourceId")
      .leftJoin(User, "creator", "creator.id = so.createdBy")
      .leftJoin(WorkflowEntity, "workflow", "workflow.id = so.workflowId")
      .leftJoin(WorkflowStateEntity, "state", "state.id = so.currentStateId")
      .leftJoin(SaleOrderStatesEntity, "globalState", "globalState.id = state.saleOrderStateId")
      .leftJoin(
        "(SELECT sale_order_id, SUM(amount) AS collected FROM sale_payments GROUP BY sale_order_id)",
        "payment_sum",
        "payment_sum.sale_order_id = so.id",
      );

    const q = params.q?.trim();
    if (q) {
      const matchedPaymentStatuses = matchSearchOptionIds(q, SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS);
      base.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where("concat(coalesce(so.serie, ''), '-', coalesce(so.correlative::text, '')) ILIKE :q", {
              q: `%${q}%`,
            })
            .orWhere("unaccent(coalesce(so.agencyDetail, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(so.note, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(client.fullName, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(client.docNumber, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(warehouse.name, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(source.name, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(source.detail, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(creator.name, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("unaccent(coalesce(creator.email, '')) ILIKE unaccent(:q)", { q: `%${q}%` });
          if (matchedPaymentStatuses.length) {
            searchQb.orWhere(`${this.paymentStatusSql()} IN (:...matchedPaymentStatuses)`, {
              matchedPaymentStatuses,
            });
          }
        }),
      );
    }

    const filters = sanitizeSaleOrderSearchFilters(params.filters ?? []);
    filters.forEach((filter, index) => {
      const valueParam = `stats_filter_${index}_value`;
      if (filter.field === SaleOrderSearchFields.CLIENT_ID && filter.values?.length) {
        base.andWhere(`so.clientId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.CREATED_BY && filter.values?.length) {
        base.andWhere(`so.createdBy ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.ASSIGNED_BY && filter.values?.length) {
        base.andWhere(`so.assignedBy ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.WAREHOUSE_ID && filter.values?.length) {
        base.andWhere(`so.warehouseId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.WORKFLOW_ID && filter.values?.length) {
        base.andWhere(`so.workflowId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.SALE_ORDER_STATE_ID && filter.values?.length) {
        base.andWhere(`state.saleOrderStateId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.BANK_ACCOUNT_ID && filter.values?.length) {
        base.andWhere(
          `EXISTS (
            SELECT 1
            FROM sale_payments filter_payment
            WHERE filter_payment.sale_order_id = so.id
            AND filter_payment.bank_account_id ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})
          )`,
          { [valueParam]: filter.values },
        );
      } else if (filter.field === SaleOrderSearchFields.CLIENT_TYPE && filter.values?.length) {
        base.andWhere(`client.type ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
          [valueParam]: filter.values,
        });
      } else if (filter.field === SaleOrderSearchFields.PAYMENT_STATUS) {
        this.applyPaymentStatusFilter(base, filter, valueParam);
      } else if (
        filter.field === SaleOrderSearchFields.SCHEDULE_DATE ||
        filter.field === SaleOrderSearchFields.DELIVERY_DATE ||
        filter.field === SaleOrderSearchFields.CREATED_AT
      ) {
        this.applyDateFilter(
          base,
          filter,
          valueParam,
          `${valueParam}_start`,
          `${valueParam}_end`,
        );
      } else if (filter.field === SaleOrderSearchFields.NUMBER && filter.value) {
        const value = `%${filter.value}%`;
        base.andWhere(
          filter.operator === SaleOrderSearchOperators.EQ
            ? "concat(coalesce(so.serie, ''), '-', coalesce(so.correlative::text, '')) = :statsNumber"
            : "concat(coalesce(so.serie, ''), '-', coalesce(so.correlative::text, '')) ILIKE :statsNumber",
          { statsNumber: filter.operator === SaleOrderSearchOperators.EQ ? filter.value : value },
        );
      } else if (
        (filter.field === SaleOrderSearchFields.ADVERTISING_CODE ||
          filter.field === SaleOrderSearchFields.OBSERVATION ||
          filter.field === SaleOrderSearchFields.AGENCY_DETAIL) &&
        filter.value
      ) {
        const column = filter.field === SaleOrderSearchFields.ADVERTISING_CODE
          ? "so.advertisingCode"
          : filter.field === SaleOrderSearchFields.AGENCY_DETAIL
            ? "so.agencyDetail"
            : "so.observation";
        base.andWhere(
          filter.operator === SaleOrderSearchOperators.EQ
            ? `unaccent(coalesce(${column}, '')) = unaccent(:${valueParam})`
            : `unaccent(coalesce(${column}, '')) ILIKE unaccent(:${valueParam})`,
          { [valueParam]: filter.operator === SaleOrderSearchOperators.EQ ? filter.value : `%${filter.value}%` },
        );
      }
    });

    if (!params.includeCancelled) {
      base.andWhere("(globalState.code IS NULL OR upper(globalState.code) <> :cancelCode)", {
        cancelCode: "CANCELLED",
      });
    }

    const [workflowRows, stateRows, clientTypeRows, totalsRow, bankAccountRows] = await Promise.all([
      base
        .clone()
        .select("workflow.id", "id")
        .addSelect("COALESCE(workflow.name, 'Sin flujo')", "label")
        .addSelect("COUNT(so.id)", "count")
        .groupBy("workflow.id")
        .addGroupBy("workflow.name")
        .orderBy("count", "DESC")
        .getRawMany<{ id: string | null; label: string; count: string }>(),
      base
        .clone()
        .select("globalState.id", "id")
        .addSelect("COALESCE(globalState.name, 'Sin estado')", "label")
        .addSelect("globalState.color", "color")
        .addSelect("COUNT(so.id)", "count")
        .groupBy("globalState.id")
        .addGroupBy("globalState.name")
        .addGroupBy("globalState.color")
        .orderBy("count", "DESC")
        .getRawMany<{ id: string | null; label: string; color: string | null; count: string }>(),
      base
        .clone()
        .select("client.type", "type")
        .addSelect("COUNT(so.id)", "count")
        .groupBy("client.type")
        .orderBy("count", "DESC")
        .getRawMany<{ type: ClientType; count: string }>(),
      base
        .clone()
        .select("COUNT(so.id)", "orders")
        .addSelect("COALESCE(SUM(so.deliveryCost), 0)", "deliveryCostSum")
        .addSelect("COALESCE(SUM(so.total), 0)", "total")
        .addSelect("COALESCE(SUM(COALESCE(payment_sum.collected, 0)), 0)", "collected")
        .addSelect(
          "COALESCE(SUM(GREATEST(so.total - COALESCE(payment_sum.collected, 0), 0)), 0)",
          "pending",
        )
        .getRawOne<{ 
          orders: string;
          total: string;
          collected: string;
          pending: string; 
          deliveryCostSum: string;
        }>(),
      base
        .clone()
        .innerJoin(SalePaymentEntity, "payment", "payment.saleOrderId = so.id")
        .leftJoin(CompanyPaymentAccountEntity, "bankAccount", "bankAccount.id = payment.bankAccountId")
        .select("bankAccount.id", "id")
        .addSelect("COALESCE(bankAccount.name, 'Sin cuenta')", "label")
        .addSelect("bankAccount.accountNumber", "number")
        .addSelect("COUNT(payment.id)", "payments")
        .addSelect("COALESCE(SUM(payment.amount), 0)", "collected")
        .groupBy("bankAccount.id")
        .addGroupBy("bankAccount.name")
        .addGroupBy("bankAccount.accountNumber")
        .orderBy("collected", "DESC")
        .getRawMany<{
          id: string | null;
          label: string;
          number: string | null;
          payments: string;
          collected: string;
        }>(),
    ]);

    const clientTypeLabels: Record<ClientType, string> = {
      [ClientType.NEW]: "Nuevo",
      [ClientType.LAGGING]: "Rezagado",
      [ClientType.REPURCHASE]: "Recompra",
      [ClientType.UNDEFINED]: "Sin definir",
    };

    return {
      byWorkflow: workflowRows.map((row) => ({ ...row, count: Number(row.count) })),
      byState: stateRows.map((row) => ({ ...row, count: Number(row.count) })),
      byClientType: clientTypeRows.map((row) => ({
        type: row.type,
        label: clientTypeLabels[row.type] ?? row.type,
        count: Number(row.count),
      })),
      byBankAccount: bankAccountRows.map((row) => ({
        id: row.id,
        label: row.label,
        number: row.number ?? null,
        payments: Number(row.payments),
        collected: Number(row.collected),
      })),
      totals: {
        orders: Number(totalsRow?.orders ?? 0),
        total: Number(totalsRow?.total ?? 0),
        collected: Number(totalsRow?.collected ?? 0),
        pending: Number(totalsRow?.pending ?? 0),
        deliveryCostSum: Number(totalsRow?.deliveryCostSum ?? 0),
      },
    };
  }

  async findById(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderGetOutput | null> {
  const manager = this.getManager(tx);

  const row = await manager.getRepository(SaleOrderEntity).findOne({
    where: { id: saleOrderId },
  });

  if (!row) return null;

  const [
    items,
    payments,
    client,
    mainTelephone,
    telephones,
    warehouse,
    source,
    creator,
    assignedUser,
    workflow,
    currentState,
    attachments,
  ] = await Promise.all([
    manager.getRepository(SaleOrderItemEntity).find({
      where: { saleOrderId: row.id },
      order: { createdAt: "ASC" },
    }),

    manager.getRepository(SalePaymentEntity).find({
      where: { saleOrderId: row.id },
      order: { createdAt: "ASC" },
    }),

    manager.getRepository(ClientEntity).findOne({
      where: { id: row.clientId },
    }),

    manager.getRepository(TelephoneEntity).findOne({
      where: {
        clientId: row.clientId,
        isMain: true,
        isActive: true,
      },
    }),

    manager.getRepository(TelephoneEntity).find({
      where: {
        clientId: row.clientId,
        isActive: true,
      },
      order: { isMain: "DESC", number: "ASC" },
    }),

    row.warehouseId
      ? manager.getRepository(WarehouseEntity).findOne({
          where: { id: row.warehouseId },
        })
      : Promise.resolve(null),

    row.sourceId
      ? manager.getRepository(SourceEntity).findOne({
          where: { id: row.sourceId },
        })
      : Promise.resolve(null),

    manager.getRepository(User).findOne({
      where: { id: row.createdBy },
    }),

    row.assignedBy
      ? manager.getRepository(User).findOne({
          where: { id: row.assignedBy },
        })
      : Promise.resolve(null),

    row.workflowId
      ? manager.getRepository(WorkflowEntity).findOne({
          where: { id: row.workflowId },
        })
      : Promise.resolve(null),

    row.currentStateId
      ? manager.getRepository(WorkflowStateEntity).findOne({
          where: { id: row.currentStateId },
          relations: { saleOrderState: true },
        })
      : Promise.resolve(null),

    manager.getRepository(SaleOrderAttachmentEntity).find({
      where: { saleOrderId: row.id, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    }),
  ]);

  const [department, province, district] = client
    ? await Promise.all([
        client.departmentId
          ? manager.getRepository(UbigeoDepartmentEntity).findOne({
              where: { id: client.departmentId },
            })
          : Promise.resolve(null),

        client.provinceId
          ? manager.getRepository(UbigeoProvinceEntity).findOne({
              where: { id: client.provinceId },
            })
          : Promise.resolve(null),

        client.districtId
          ? manager.getRepository(UbigeoDistrictEntity).findOne({
              where: { id: client.districtId },
            })
          : Promise.resolve(null),
      ])
    : [null, null, null];

  const itemIds = items.map((item) => item.id);

  const components = itemIds.length
    ? await manager.getRepository(SaleOrderItemComponentEntity).find({
        where: { saleOrderItemId: In(itemIds) },
        order: { createdAt: "ASC" },
      })
    : [];

  const skuIds = Array.from(
    new Set(components.map((component) => component.skuId).filter(Boolean)),
  ) as string[];

  const skus = skuIds.length
    ? await manager.getRepository(ProductCatalogSkuEntity).find({
        where: { id: In(skuIds) },
        relations: { product: { baseUnit: true } },
      })
    : [];

  const skuById = new Map(skus.map((sku) => [sku.id, sku]));

  const [stockItems, attributesBySkuId] = await Promise.all([
    skuIds.length
      ? manager.getRepository(ProductCatalogStockItemEntity).find({
          where: { skuId: In(skuIds) },
        })
      : Promise.resolve([]),
    this.loadSkuAttributes(manager, skuIds),
  ]);

  const stockItemBySkuId = new Map(
    stockItems.map((stockItem) => [stockItem.skuId, stockItem]),
  );

  const bankAccountIds = Array.from(
    new Set(payments.map((payment) => payment.bankAccountId).filter(Boolean)),
  ) as string[];

  const bankAccounts = bankAccountIds.length
    ? await manager.getRepository(CompanyPaymentAccountEntity).find({
        where: { id: In(bankAccountIds) },
      })
    : [];

  const bankAccountById = new Map(bankAccounts.map((account) => [account.id, account]));
  const shippingAttachment = attachments.find(
    (attachment) =>
      attachment.type === SaleOrderAttachmentType.SHIPPING_PHOTO,
  );
  const paymentAttachmentByPaymentId = new Map(
    attachments
      .filter(
        (attachment) =>
          attachment.type === SaleOrderAttachmentType.PAYMENT_PROOF &&
          attachment.saleOrderPaymentId,
      )
      .map((attachment) => [attachment.saleOrderPaymentId!, attachment]),
  );

  const toIso = (date: Date) => date.toISOString();

  const compsByItemId = new Map<string, SaleOrderGetOutput["items"][number]["components"]>();

  for (const component of components) {
    const sku = skuById.get(component.skuId);

    if (!sku) {
      throw new BadRequestException("SKU no encontrado para componente");
    }

    const list = compsByItemId.get(component.saleOrderItemId) ?? [];
    const unit = sku.product?.baseUnit ?? null;

    list.push({
      id: component.id,
      saleOrderItemId: component.saleOrderItemId,
      sku: {
        id: sku.id,
        productId: sku.productId,
        name: sku.name,
        backendSku: sku.backendSku,
        customSku: sku.customSku ?? null,
        barcode: sku.barcode ?? null,
        image: sku.image ?? null,
        price: Number(sku.price ?? 0),
        cost: Number(sku.cost ?? 0),
        isSellable: Boolean(sku.isSellable),
        isPurchasable: Boolean(sku.isPurchasable),
        isManufacturable: Boolean(sku.isManufacturable),
        isStockTracked: Boolean(sku.isStockTracked),
        isActive: Boolean(sku.isActive),
        createdAt: toIso(sku.createdAt),
        updatedAt: sku.updatedAt ? toIso(sku.updatedAt) : null,
      },
      unit: unit
        ? {
            id: unit.id,
            name: unit.name,
            code: unit.code,
          }
        : null,
      attributes: attributesBySkuId.get(sku.id) ?? [],
      stockItemId: stockItemBySkuId.get(sku.id)?.id ?? null,
      referencePackItemId: component.referencePackItemId ?? null,
      quantity: Number(component.quantity ?? 0),
      unitPrice: Number(component.unitPrice ?? 0),
      total: Number(component.total ?? 0),
      createdAt: toIso(component.createdAt),
    });

    compsByItemId.set(component.saleOrderItemId, list);
  }

  const totalPaid = payments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
  const totalOrder = Number(row.total ?? 0);
  const pendingAmount = Math.max(totalOrder - totalPaid, 0);
  const paymentStatus: SaleOrderPaymentStatus = totalPaid >= totalOrder ? "PAID" : "PENDING";

  return {
    id: row.id,
    serie: row.serie ?? null,
    correlative: row.correlative ?? null,

    warehouse: warehouse
      ? {
          id: warehouse.id,
          name: warehouse.name,
        }
      : null,

    client: client
      ? {
          id: client.id,
          type: client.type,
          docType: client.docType,
          fullName: client.fullName,
          docNumber: client.docNumber ?? null,
          address: client.address ?? null,
          isActive: Boolean(client.isActive),

          departmentId: client.departmentId ?? null,
          provinceId: client.provinceId ?? null,
          districtId: client.districtId ?? null,

          department: department
            ? {
                id: department.id,
                name: department.name,
              }
            : null,

          province: province
            ? {
                id: province.id,
                name: province.name,
                departmentId: province.departmentId,
              }
            : null,

          district: district
            ? {
                id: district.id,
                name: district.name,
                provinceId: district.provinceId,
              }
            : null,

          reference: client.reference ?? null,
          mainPhone: mainTelephone?.number ?? null,
          telephones: telephones.map((telephone) => ({
            id: telephone.id,
            number: telephone.number,
            isMain: Boolean(telephone.isMain),
            isActive: Boolean(telephone.isActive),
          })),
        }
      : null,

    agencySubsidiaryId: row.agencySubsidiaryId ?? null,
    agencyDetail: row.agencyDetail ?? null,

    source: source
      ? {
          id: source.id,
          name: source.name,
          detail: source.detail ?? null,
        }
      : null,

    scheduleDate: row.scheduleDate ?? null,
    deliveryDate: row.deliveryDate ?? null,
    subTotal: Number(row.subTotal ?? 0),
    deliveryCost: Number(row.deliveryCost ?? 0),
    discount: Number(row.discount ?? 0),
    total: totalOrder,
    note: row.note ?? null,
    advertisingCode: row.advertisingCode ?? null,
    observation: row.observation ?? null,
    sendDate: row.sendDate ? toIso(row.sendDate) : null,
    sendPhoto: shippingAttachment?.url ?? null,
    sendCode: row.sendCode ?? null,
    sendAddress: row.sendAddress ?? null,
    assignedBy: assignedUser
      ? {
          id: assignedUser.id,
          name: assignedUser.name,
          email: assignedUser.email,
        }
      : null,

    createdBy: creator
      ? {
          id: creator.id,
          name: creator.name,
          email: creator.email,
        }
      : null,

    workflow: workflow
      ? {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description ?? null,
          isActive: workflow.isActive,
        }
      : null,

    currentState: currentState
      ? {
          id: currentState.id,
          code: currentState.saleOrderState?.code ?? "",
          name: currentState.saleOrderState?.name ?? "",
          color: currentState.saleOrderState?.color ?? "",
          isInitial: currentState.isInitial,
          isFinal: currentState.isFinal,
          isActive: currentState.isActive,
        }
      : null,

    invoiceSend: Boolean(row.invoiceSend),
    reserveBool: Boolean(row.reserveBool),
    isActive: Boolean(row.isActive),
    createdAt: toIso(row.createdAt),
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : null,

    items: items.map((item) => ({
      id: item.id,
      referencePackId: item.referencePackId ?? null,
      description: item.description ?? null,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      total: Number(item.total ?? 0),
      createdAt: toIso(item.createdAt),
      components: compsByItemId.get(item.id) ?? [],
    })),

    payments: payments.map((payment) => ({
      id: payment.id,
      clientKey: payment.id,
      bankAccount: payment.bankAccountId
        ? (() => {
            const account = bankAccountById.get(payment.bankAccountId);

            return account
              ? {
                  id: account.id,
                  name: account.name,
                  number: account.accountNumber ?? null,
                }
              : null;
          })()
        : null,
      date: toIso(payment.date),
      method: payment.method,
      operationNumber: payment.operationNumber ?? null,
      amount: Number(payment.amount ?? 0),
      note: payment.note ?? null,
      paymentPhoto:
        paymentAttachmentByPaymentId.get(payment.id)?.url ?? null,
      createdAt: toIso(payment.createdAt),
    })),

    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      saleOrderPaymentId: attachment.saleOrderPaymentId ?? null,
      type: attachment.type,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
      url: attachment.url,
      note: attachment.note ?? null,
      createdAt: toIso(attachment.createdAt),
    })),

    editPolicy: {
      stockStatus: "NONE",
      productsEditable: true,
      warehouseEditable: true,
      isFinal: false,
      reason: null,
    },

    totalPaid,
    pendingAmount,
    paymentStatus,
  };
}
}
