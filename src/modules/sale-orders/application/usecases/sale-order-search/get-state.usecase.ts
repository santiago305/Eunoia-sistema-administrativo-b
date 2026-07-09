import { Inject } from "@nestjs/common";
import { SaleOrderSearchStateOutput } from "src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output";
import { SaleOrderSearchSnapshot } from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import {
  buildSaleOrderSearchLabel,
  SALE_ORDER_CLIENT_TYPE_SEARCH_OPTIONS,
  SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS,
  sanitizeSaleOrderSearchSnapshot,
} from "src/modules/sale-orders/application/support/sale-order-search.utils";
import { SaleOrderInvoiceStatusValues } from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import { SALE_ORDER_SEARCH, SaleOrderSearchRepository } from "src/modules/sale-orders/domain/ports/sale-order-search.repository";

const SALE_ORDERS_SEARCH_TABLE_KEY = "sale-orders";

export class GetSaleOrderSearchStateUsecase {
  constructor(
    @Inject(SALE_ORDER_SEARCH)
    private readonly saleOrderSearchRepo: SaleOrderSearchRepository,
  ) {}

  async execute(userId: string): Promise<SaleOrderSearchStateOutput> {
    const state = await this.saleOrderSearchRepo.listState({ userId, tableKey: SALE_ORDERS_SEARCH_TABLE_KEY });

    const maps = {
      paymentStatuses: new Map(SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      clients: new Map(state.clients.map((item) => [item.clientId, item.label])),
      creators: new Map((state.creators ?? []).map((item) => [item.userId, item.label])),
      assignees: new Map((state.assignees ?? []).map((item) => [item.userId, item.label])),
      warehouses: new Map(state.warehouses.map((item) => [item.warehouseId, item.label])),
      workflows: new Map(state.workflows.map((item) => [item.workflowId, item.label])),
      states: new Map(state.states.map((item) => [item.saleOrderStateId, item.label])),
      bankAccounts: new Map(state.bankAccounts.map((item) => [item.bankAccountId, item.label])),
      clientTypes: new Map(SALE_ORDER_CLIENT_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      departments: new Map((state.departments ?? []).map((item) => [item.id, item.label])),
      provinces: new Map((state.provinces ?? []).map((item) => [item.id, item.label])),
      districts: new Map((state.districts ?? []).map((item) => [item.id, item.label])),
      sources: new Map((state.sources ?? []).map((item) => [item.id, item.label])),
      invoiceStatuses: new Map([
        [SaleOrderInvoiceStatusValues.SENT, "Enviado"],
        [SaleOrderInvoiceStatusValues.PENDING, "Sin enviar"],
      ]),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeSaleOrderSearchSnapshot(item.snapshot as SaleOrderSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildSaleOrderSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeSaleOrderSearchSnapshot(item.snapshot as SaleOrderSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildSaleOrderSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        clients: state.clients.map((item) => ({ id: item.clientId, label: item.label })),
        creators: (state.creators ?? []).map((item) => ({ id: item.userId, label: item.label })),
        assignees: (state.assignees ?? []).map((item) => ({ id: item.userId, label: item.label })),
        warehouses: state.warehouses.map((item) => ({ id: item.warehouseId, label: item.label })),
        paymentStatuses: SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS,
        workflows: state.workflows.map((item) => ({ id: item.workflowId, label: item.label })),
        states: state.states.map((item) => ({ id: item.saleOrderStateId, label: item.label })),
        bankAccounts: state.bankAccounts.map((item) => ({ id: item.bankAccountId, label: item.label })),
        clientTypes: SALE_ORDER_CLIENT_TYPE_SEARCH_OPTIONS,
        departments: state.departments ?? [],
        provinces: state.provinces ?? [],
        districts: state.districts ?? [],
        sources: state.sources ?? [],
        invoiceStatuses: [
          { id: SaleOrderInvoiceStatusValues.SENT, label: "Enviado" },
          { id: SaleOrderInvoiceStatusValues.PENDING, label: "Sin enviar" },
        ],
      },
    };
  }
}
