import { Inject } from "@nestjs/common";
import { PurchaseSearchStateOutput } from "../../dtos/purchase-search/output/purchase-search-state.output";
import { PURCHASE_SEARCH, PurchaseSearchRepository } from "src/modules/purchases/domain/ports/purchase-search.repository";
import {
  buildPurchaseSearchLabel,
  PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS,
  PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS,
  PURCHASE_STATUS_SEARCH_OPTIONS,
} from "../../support/purchase-search.utils";

const PURCHASE_SEARCH_TABLE_KEY = "purchase-orders";

export class GetPurchaseOrderSearchStateUsecase {
  constructor(
    @Inject(PURCHASE_SEARCH)
    private readonly purchaseSearchRepo: PurchaseSearchRepository,
  ) {}

  async execute(userId: string): Promise<PurchaseSearchStateOutput> {
    const state = await this.purchaseSearchRepo.listState({
      userId,
      tableKey: PURCHASE_SEARCH_TABLE_KEY,
    });

    const supplierUsageOrder = new Map<string, number>();
    state.recent.forEach((recent) => {
      recent.snapshot.filters.supplierIds.forEach((supplierId, index) => {
        if (!supplierUsageOrder.has(supplierId)) {
          supplierUsageOrder.set(supplierId, supplierUsageOrder.size + index);
        }
      });
    });

    const orderedSuppliers = [...state.suppliers].sort((a, b) => {
      const leftUsage = supplierUsageOrder.get(a.supplierId);
      const rightUsage = supplierUsageOrder.get(b.supplierId);

      if (leftUsage !== undefined && rightUsage !== undefined) {
        return leftUsage - rightUsage;
      }

      if (leftUsage !== undefined) return -1;
      if (rightUsage !== undefined) return 1;
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });

    const maps = {
      suppliers: new Map(state.suppliers.map((item) => [item.supplierId, item.label])),
      warehouses: new Map(state.warehouses.map((item) => [item.warehouseId, item.label])),
      statuses: new Map(PURCHASE_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      documentTypes: new Map(PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      paymentForms: new Map(PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        label: buildPurchaseSearchLabel(item.snapshot, maps),
        snapshot: item.snapshot,
        lastUsedAt: item.lastUsedAt,
      })),
      saved: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        label: buildPurchaseSearchLabel(item.snapshot, maps),
        snapshot: item.snapshot,
        updatedAt: item.updatedAt,
      })),
      catalogs: {
        suppliers: orderedSuppliers.map((item) => ({
          id: item.supplierId,
          label: item.label,
        })),
        warehouses: state.warehouses.map((item) => ({
          id: item.warehouseId,
          label: item.label,
        })),
        statuses: PURCHASE_STATUS_SEARCH_OPTIONS,
        documentTypes: PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS,
        paymentForms: PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS,
      },
    };
  }
}
