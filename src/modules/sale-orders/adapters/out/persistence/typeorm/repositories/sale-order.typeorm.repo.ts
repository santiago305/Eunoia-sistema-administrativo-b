import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, EntityManager, In, Repository, SelectQueryBuilder } from "typeorm";
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
  matchSearchOptionIds,
  SALE_ORDER_AGENDA_STATUS_SEARCH_OPTIONS,
  SALE_ORDER_DELIVERY_STATUS_SEARCH_OPTIONS,
  SALE_ORDER_DELIVERY_TYPE_SEARCH_OPTIONS,
  SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS,
  sanitizeSaleOrderSearchFilters,
} from "src/modules/sale-orders/application/support/sale-order-search.utils";
import { BankAccountEntity } from "src/modules/bank-accounts/adapters/out/persistence/typeorm/entities/bank-account.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { SaleOrderGetOutput } from "src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output";
import { SaleOrderItemComponentEntity } from "../entities/sale-order-item-component.entity";
import { SaleOrderItemEntity } from "../entities/sale-order-item.entity";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";

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

  private toDomain(row: SaleOrderEntity): SaleOrder {
    return new SaleOrder(
      row.id,
      row.serie ?? null,
      row.correlative ?? null,
      row.warehouseId,
      row.clientId,
      row.agencyDetail ?? null,
      row.sourceId ?? null,
      row.scheduleDate ?? null,
      row.deliveryDate ?? null,
      row.deliveryType ?? null,
      Number(row.subTotal ?? 0),
      Number(row.deliveryCost ?? 0),
      Number(row.total ?? 0),
      row.note ?? null,
      row.createdBy,
      row.agendaStatus,
      row.deliveryStatus ?? null,
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
    );
  }

  async create(input: Parameters<SaleOrderRepository["create"]>[0], tx?: TransactionContext): Promise<SaleOrder> {
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SaleOrderEntity).save({
      serie: input.serie ?? null,
      correlative: input.correlative ?? null,
      warehouseId: input.warehouseId,
      clientId: input.clientId,
      agencyDetail: input.agencyDetail ?? null,
      sourceId: input.sourceId ?? null,
      scheduleDate: input.scheduleDate ?? null,
      deliveryDate: input.deliveryDate ?? null,
      deliveryType: input.deliveryType ?? null,
      subTotal: input.subTotal,
      deliveryCost: input.deliveryCost,
      total: input.total,
      note: input.note ?? null,
      createdBy: input.createdBy,
      agendaStatus: input.agendaStatus,
      deliveryStatus: input.deliveryStatus ?? null,
      isActive: input.isActive ?? true,
    });
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
      warehouseId: input.warehouseId,
      clientId: input.clientId,
      agencyDetail: input.agencyDetail ?? null,
      sourceId: input.sourceId ?? null,
      scheduleDate: input.scheduleDate ?? null,
      deliveryDate: input.deliveryDate ?? null,
      deliveryType: input.deliveryType ?? null,
      subTotal: input.subTotal,
      deliveryCost: input.deliveryCost,
      total: input.total,
      note: input.note ?? null,
    });

    return this.toDomain(saved);
  }
  async countSaleOrdersByClientId(
    clientId: string,
    tx?: TransactionContext,
  ): Promise<number> {
    const manager = this.getManager(tx);
    return manager.getRepository(SaleOrderEntity).count({
      where: {
        clientId,
        deliveryStatus: DeliveryStatus.DELIVERED,
        isActive: true,
      },
    });
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

  private applyDateFilter(
    qb: SelectQueryBuilder<SaleOrderEntity>,
    filter: SaleOrderSearchRule,
    valueParam: string,
    rangeStartParam: string,
    rangeEndParam: string,
  ) {
    const column = filter.field === SaleOrderSearchFields.SCHEDULE_DATE ? "so.scheduleDate" : "so.deliveryDate";

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
  async updateStatuses(
  input: {
    saleOrderId: string;
    agendaStatus?: AgendaStatus;
    deliveryStatus?: DeliveryStatus | null;
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
    if (input.agendaStatus !== undefined) {
      row.agendaStatus = input.agendaStatus;
    }
    if (input.deliveryStatus !== undefined) {
      row.deliveryStatus = input.deliveryStatus;
    }
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

 async listIdsToProgramForDeliveryDate(
    input: { deliveryDate: string; limit?: number },
    tx?: TransactionContext,
  ): Promise<string[]> {
    const manager = this.getManager(tx);
    const qb = manager
      .getRepository(SaleOrderEntity)
      .createQueryBuilder("so")
      .select("so.id", "id")
      .where("so.deliveryDate <= :deliveryDate", { deliveryDate: input.deliveryDate })
      .andWhere("so.agendaStatus != :agendaCanceled", { agendaCanceled: AgendaStatus.CANCELED })
      .andWhere("(so.deliveryStatus IS NULL OR so.deliveryStatus NOT IN (:...blocked))", {
        blocked: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELED],
      })
      .andWhere("NOT (so.agendaStatus = :programmed AND so.deliveryStatus = :inProgress)", {
        programmed: AgendaStatus.PROGRAMMED,
        inProgress: DeliveryStatus.IN_PROGRESS,
      })
      .orderBy("so.deliveryDate", "ASC")
      .addOrderBy("so.createdAt", "ASC")
      .limit(input.limit ?? 500);

    const rows = await qb.getRawMany<{ id: string }>();

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
      const matchedAgendaStatuses = matchSearchOptionIds(q, SALE_ORDER_AGENDA_STATUS_SEARCH_OPTIONS);
      const matchedDeliveryStatuses = matchSearchOptionIds(q, SALE_ORDER_DELIVERY_STATUS_SEARCH_OPTIONS);
      const matchedDeliveryTypes = matchSearchOptionIds(q, SALE_ORDER_DELIVERY_TYPE_SEARCH_OPTIONS);

      qb.andWhere(
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
            .orWhere("unaccent(coalesce(creator.email, '')) ILIKE unaccent(:q)", { q: `%${q}%` })
            .orWhere("so.agendaStatus::text ILIKE :q", { q: `%${q}%` })
            .orWhere("so.deliveryStatus::text ILIKE :q", { q: `%${q}%` })
            .orWhere("so.deliveryType::text ILIKE :q", { q: `%${q}%` });

          if (matchedPaymentStatuses.length) {
            searchQb.orWhere(`${this.paymentStatusSql()} IN (:...matchedPaymentStatuses)`, { matchedPaymentStatuses });
          }

          if (matchedAgendaStatuses.length) {
            searchQb.orWhere("so.agendaStatus IN (:...matchedAgendaStatuses)", { matchedAgendaStatuses });
          }

          if (matchedDeliveryStatuses.length) {
            searchQb.orWhere("so.deliveryStatus IN (:...matchedDeliveryStatuses)", { matchedDeliveryStatuses });
          }

          if (matchedDeliveryTypes.length) {
            searchQb.orWhere("so.deliveryType IN (:...matchedDeliveryTypes)", { matchedDeliveryTypes });
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
        case SaleOrderSearchFields.WAREHOUSE_ID:
          if (filter.values?.length) {
            qb.andWhere(`so.warehouseId ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.AGENDA_STATUS:
          if (filter.values?.length) {
            qb.andWhere(`so.agendaStatus ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.DELIVERY_STATUS:
          if (filter.values?.length) {
            qb.andWhere(`so.deliveryStatus ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.DELIVERY_TYPE:
          if (filter.values?.length) {
            qb.andWhere(`so.deliveryType ${filter.mode === "exclude" ? "NOT IN" : "IN"} (:...${valueParam})`, {
              [valueParam]: filter.values,
            });
          }
          break;
        case SaleOrderSearchFields.PAYMENT_STATUS:
          this.applyPaymentStatusFilter(qb, filter, valueParam);
          break;
        case SaleOrderSearchFields.SCHEDULE_DATE:
        case SaleOrderSearchFields.DELIVERY_DATE:
          this.applyDateFilter(qb, filter, valueParam, rangeStartParam, rangeEndParam);
          break;
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
    const userIds = Array.from(new Set(rows.map((row) => row.createdBy).filter(Boolean))) as string[];

    const [payments, clients, warehouses, sources, users] = await Promise.all([
      manager.getRepository(SalePaymentEntity).find({
        where: { saleOrderId: In(saleOrderIds) },
        order: { createdAt: "ASC" },
      }),
      clientIds.length
        ? manager.getRepository(ClientEntity).find({ where: { id: In(clientIds) } })
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
    ]);

    const bankAccountIds = Array.from(new Set(payments.map((p) => p.bankAccountId).filter(Boolean))) as string[];
    const bankAccounts = bankAccountIds.length
      ? await manager.getRepository(BankAccountEntity).find({ where: { id: In(bankAccountIds) } })
      : [];

    const clientById = new Map(clients.map((row) => [row.id, row]));
    const warehouseById = new Map(warehouses.map((row) => [row.id, row]));
    const sourceById = new Map(sources.map((row) => [row.id, row]));
    const userById = new Map(users.map((row) => [row.id, row]));
    const bankAccountById = new Map(bankAccounts.map((row) => [row.id, row]));

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

      return {
        id: row.id,
        serie: row.serie ?? null,
        correlative: row.correlative ?? null,
        warehouse: warehouse ? { id: warehouse.id, name: warehouse.name } : null,
        client: client
          ? {
              id: client.id,
              type: client.type,
              fullName: client.fullName,
              docNumber: client.docNumber ?? null,
              reference: client.reference ?? null,
              count: await this.countSaleOrdersByClientId(client.id, tx),
            }
          : null,
        agencyDetail: row.agencyDetail ?? null,
        source: source ? { id: source.id, name: source.name, detail: source.detail ?? null } : null,
        scheduleDate: row.scheduleDate ?? null,
        deliveryDate: row.deliveryDate ?? null,
        deliveryType: row.deliveryType ?? null,
        subTotal: Number(row.subTotal ?? 0),
        deliveryCost: Number(row.deliveryCost ?? 0),
        total: totalOrder,
        note: row.note ?? null,
        createdBy: creator ? { id: creator.id, name: creator.name, email: creator.email } : null,
        agendaStatus: row.agendaStatus,
        deliveryStatus: row.deliveryStatus ?? null,
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
                return account ? { id: account.id, name: account.name, number: account.number ?? null } : null;
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
  async findById(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderGetOutput | null> {
    const manager = this.getManager(tx);

    const row = await manager.getRepository(SaleOrderEntity).findOne({
      where: { id: saleOrderId },
    });
    if (!row) return null;
    const [items, payments, client, warehouse, source, creator] = await Promise.all([
      manager.getRepository(SaleOrderItemEntity).find({
        where: { saleOrderId: row.id },
        order: { createdAt: "ASC" },
      }),
      manager.getRepository(SalePaymentEntity).find({
        where: { saleOrderId: row.id },
        order: { createdAt: "ASC" },
      }),
      manager.getRepository(ClientEntity).findOne({ where: { id: row.clientId } }),
      manager.getRepository(WarehouseEntity).findOne({ where: { id: row.warehouseId } }),
      row.sourceId
        ? manager.getRepository(SourceEntity).findOne({ where: { id: row.sourceId } })
        : Promise.resolve(null),
      manager.getRepository(User).findOne({ where: { id: row.createdBy } }),
    ]);

    const itemIds = items.map((item) => item.id);
    const components = itemIds.length
      ? await manager.getRepository(SaleOrderItemComponentEntity).find({
          where: { saleOrderItemId: In(itemIds) },
          order: { createdAt: "ASC" },
        })
      : [];

    const skuIds = Array.from(new Set(components.map((component) => component.skuId).filter(Boolean)));

    const skus = skuIds.length
      ? await manager.getRepository(ProductCatalogSkuEntity).find({
          where: { id: In(skuIds) },
        })
      : [];
    const skuById = new Map(skus.map((sku) => [sku.id, sku]));
    const bankAccountIds = Array.from(
      new Set(payments.map((payment) => payment.bankAccountId).filter(Boolean)),
    ) as string[];
    const bankAccounts = bankAccountIds.length
      ? await manager.getRepository(BankAccountEntity).find({
          where: { id: In(bankAccountIds) },
        })
      : [];
    const bankAccountById = new Map(bankAccounts.map((account) => [account.id, account]));
    const toIso = (date: Date) => date.toISOString();
    const compsByItemId = new Map<string, SaleOrderGetOutput["items"][number]["components"]>();
    for (const component of components) {
      const sku = skuById.get(component.skuId);
      if (!sku) {
        throw new BadRequestException("SKU no encontrado para componente");
      }
      const list = compsByItemId.get(component.saleOrderItemId) ?? [];
      list.push({
        id: component.id,
        saleOrderItemId: component.saleOrderItemId,
        sku: {
          id: sku.id,
          name: sku.name,
          backendSku: sku.backendSku,
          customSku: sku.customSku ?? null,
          barcode: sku.barcode ?? null,
        },
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
      warehouse: warehouse ? { id: warehouse.id, name: warehouse.name } : null,
      client: client
        ? {
            id: client.id,
            type: client.type,
            fullName: client.fullName,
            docNumber: client.docNumber ?? null,
            reference: client.reference ?? null,
          }
        : null,
      agencyDetail: row.agencyDetail ?? null,
      source: source ? { id: source.id, name: source.name, detail: source.detail ?? null } : null,
      scheduleDate: row.scheduleDate ?? null,
      deliveryDate: row.deliveryDate ?? null,
      deliveryType: row.deliveryType ?? null,
      subTotal: Number(row.subTotal ?? 0),
      deliveryCost: Number(row.deliveryCost ?? 0),
      total: totalOrder,
      note: row.note ?? null,
      createdBy: creator ? { id: creator.id, name: creator.name, email: creator.email } : null,
      agendaStatus: row.agendaStatus,
      deliveryStatus: row.deliveryStatus ?? null,
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
        bankAccount: payment.bankAccountId
          ? (() => {
              const account = bankAccountById.get(payment.bankAccountId);
              return account ? { id: account.id, name: account.name, number: account.number ?? null } : null;
            })()
          : null,
        date: toIso(payment.date),
        method: payment.method,
        operationNumber: payment.operationNumber ?? null,
        amount: Number(payment.amount ?? 0),
        note: payment.note ?? null,
        createdAt: toIso(payment.createdAt),
      })),
      totalPaid,
      pendingAmount,
      paymentStatus,
    };
  }
  
}
