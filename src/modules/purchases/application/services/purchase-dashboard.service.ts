import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { PurchaseDashboardFiltersInput } from "src/modules/purchases/application/dtos/purchase-dashboard.input";
import {
  PurchaseDashboardMonthlyPointOutput,
  PurchaseDashboardPaymentRowOutput,
  PurchaseDashboardSeriesPointOutput,
  PurchaseDashboardSummaryOutput,
  PurchaseDashboardTopItemOutput,
  PurchaseDashboardTopSupplierOutput,
} from "src/modules/purchases/application/dtos/purchase-dashboard.output";

export const PURCHASE_DASHBOARD = "PURCHASE_DASHBOARD";

export interface PurchaseDashboardReader {
  summary(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSummaryOutput>;
  byType(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]>;
  byStatus(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]>;
  topItems(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardTopItemOutput[]>;
  topSuppliers(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardTopSupplierOutput[]>;
  monthlySpending(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardMonthlyPointOutput[]>;
  upcomingPayments(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardPaymentRowOutput[]>;
  overduePayments(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardPaymentRowOutput[]>;
  paymentMethodUsage(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]>;
  internalVsInventory(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]>;
}

type SqlFilter = {
  where: string[];
  values: unknown[];
};

export class PurchaseDashboardService implements PurchaseDashboardReader {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async summary(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSummaryOutput> {
    const purchaseFilters = this.buildPurchaseFilters(filters);
    const paymentFilters = this.buildPaymentBaseFilters(filters);
    const payableFilters = this.buildPayableFilters(filters);

    const [purchaseRow] = await this.manager.query(
      `
        SELECT
          COALESCE(SUM(po.total), 0)::numeric AS "totalPurchased",
          COUNT(*) FILTER (WHERE po.status = 'DRAFT')::int AS drafts,
          COUNT(*) FILTER (WHERE po.approval_status = 'PENDING' OR po.status IN ('SENT', 'PENDING_RECEIPT_CONFIRMATION'))::int AS "toApprove",
          COUNT(*) FILTER (WHERE po.status = 'RECEIVED')::int AS received
        FROM purchase_orders po
        WHERE ${purchaseFilters.where.join(" AND ")}
      `,
      purchaseFilters.values,
    );
    const [paymentRow] = await this.manager.query(
      `
        SELECT
          COALESCE(SUM(pd.amount) FILTER (WHERE pd.status = 'APPROVED'), 0)::numeric AS "totalPaid",
          COUNT(*) FILTER (WHERE pd.status = 'PENDING_APPROVAL')::int AS "paymentsToApprove"
        FROM payment_documents pd
        INNER JOIN purchase_orders po ON po.po_id = pd.po_id
        WHERE ${paymentFilters.where.join(" AND ")}
      `,
      paymentFilters.values,
    );
    const [payableRow] = await this.manager.query(
      `
        SELECT
          COALESCE(SUM(ap.amount_pending), 0)::numeric AS pending,
          COALESCE(SUM(ap.amount_pending) FILTER (WHERE ap.status = 'OVERDUE' OR ap.due_date < CURRENT_DATE), 0)::numeric AS overdue
        FROM accounts_payable ap
        INNER JOIN purchase_orders po ON po.po_id = ap.purchase_id
        WHERE ${payableFilters.where.join(" AND ")}
      `,
      payableFilters.values,
    );

    return {
      totalPurchased: toNumber(purchaseRow?.totalPurchased),
      totalPaid: toNumber(paymentRow?.totalPaid),
      pending: toNumber(payableRow?.pending),
      overdue: toNumber(payableRow?.overdue),
      drafts: toNumber(purchaseRow?.drafts),
      toApprove: toNumber(purchaseRow?.toApprove),
      paymentsToApprove: toNumber(paymentRow?.paymentsToApprove),
      received: toNumber(purchaseRow?.received),
    };
  }

  async byType(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]> {
    const sqlFilters = this.buildPurchaseFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT po.purchase_type AS label, COALESCE(SUM(po.total), 0)::numeric AS value, COUNT(*)::int AS count
        FROM purchase_orders po
        WHERE ${sqlFilters.where.join(" AND ")}
        GROUP BY po.purchase_type
        ORDER BY value DESC
      `,
      sqlFilters.values,
    );
    return rows.map(toSeriesPoint);
  }

  async byStatus(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]> {
    const sqlFilters = this.buildPurchaseFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT po.payment_status AS label, COALESCE(SUM(po.total), 0)::numeric AS value, COUNT(*)::int AS count
        FROM purchase_orders po
        WHERE ${sqlFilters.where.join(" AND ")}
        GROUP BY po.payment_status
        ORDER BY value DESC
      `,
      sqlFilters.values,
    );
    return rows.map(toSeriesPoint);
  }

  async topItems(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardTopItemOutput[]> {
    const sqlFilters = this.buildPurchaseFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT
          COALESCE(poi.stock_item_id, poi.internal_material_id, poi.asset_category_id)::text AS "itemId",
          COALESCE(
            NULLIF(trim(poi.service_name), ''),
            NULLIF(trim(poi.description), ''),
            NULLIF(sku.name, ''),
            NULLIF(product.name, ''),
            poi.stock_item_id::text,
            poi.internal_material_id::text,
            poi.asset_category_id::text,
            'Sin nombre'
          ) AS label,
          poi.item_type AS "itemType",
          COALESCE(SUM(poi.purchase_value), 0)::numeric AS total,
          COALESCE(SUM(poi.quantity), 0)::numeric AS quantity
        FROM purchase_order_items poi
        INNER JOIN purchase_orders po ON po.po_id = poi.po_id
        LEFT JOIN pc_stock_items psi ON psi.stock_item_id = poi.stock_item_id
        LEFT JOIN pc_skus sku ON sku.sku_id = psi.sku_id
        LEFT JOIN pc_products product ON product.product_id = sku.product_id
        WHERE ${sqlFilters.where.join(" AND ")}
        GROUP BY "itemId", label, poi.item_type
        ORDER BY total DESC
        LIMIT 10
      `,
      sqlFilters.values,
    );
    return rows.map((row: any) => ({
      itemId: row.itemId ?? null,
      label: row.label ?? "Sin nombre",
      itemType: row.itemType ?? "UNKNOWN",
      total: toNumber(row.total),
      quantity: toNumber(row.quantity),
    }));
  }

  async topSuppliers(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardTopSupplierOutput[]> {
    const sqlFilters = this.buildPurchaseFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT
          po.supplier_id::text AS "supplierId",
          ${supplierNameSql("s")} AS "supplierName",
          COALESCE(SUM(po.total), 0)::numeric AS total,
          COUNT(*)::int AS count
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id
        WHERE ${sqlFilters.where.join(" AND ")}
        GROUP BY po.supplier_id, s.trade_name, s.name, s.last_name
        ORDER BY total DESC
        LIMIT 10
      `,
      sqlFilters.values,
    );
    return rows.map((row: any) => ({
      supplierId: row.supplierId ?? null,
      supplierName: row.supplierName ?? "Sin proveedor",
      total: toNumber(row.total),
      count: toNumber(row.count),
    }));
  }

  async monthlySpending(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardMonthlyPointOutput[]> {
    const purchaseFilters = this.buildPurchaseFilters(filters);
    const paymentFilters = this.buildPaymentFilters(filters, purchaseFilters.values.length);
    const rows = await this.manager.query(
      `
        WITH purchased AS (
          SELECT to_char(date_trunc('month', COALESCE(po.date_issue, po.created_at)), 'YYYY-MM') AS month,
                 COALESCE(SUM(po.total), 0)::numeric AS purchased
          FROM purchase_orders po
          WHERE ${purchaseFilters.where.join(" AND ")}
          GROUP BY month
        ),
        paid AS (
          SELECT to_char(date_trunc('month', pd.date), 'YYYY-MM') AS month,
                 COALESCE(SUM(pd.amount), 0)::numeric AS paid
          FROM payment_documents pd
          INNER JOIN purchase_orders po ON po.po_id = pd.po_id
          WHERE ${paymentFilters.where.join(" AND ")}
          GROUP BY month
        )
        SELECT COALESCE(purchased.month, paid.month) AS month,
               COALESCE(purchased.purchased, 0)::numeric AS purchased,
               COALESCE(paid.paid, 0)::numeric AS paid
        FROM purchased
        FULL OUTER JOIN paid ON paid.month = purchased.month
        ORDER BY month ASC
      `,
      [...purchaseFilters.values, ...paymentFilters.values],
    );
    return rows.map((row: any) => ({
      month: row.month,
      purchased: toNumber(row.purchased),
      paid: toNumber(row.paid),
    }));
  }

  async upcomingPayments(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardPaymentRowOutput[]> {
    return this.paymentRows(filters, "ap.status IN ('PENDING', 'PARTIAL') AND (ap.due_date IS NULL OR ap.due_date >= CURRENT_DATE)");
  }

  async overduePayments(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardPaymentRowOutput[]> {
    return this.paymentRows(filters, "ap.status = 'OVERDUE' OR ap.due_date < CURRENT_DATE");
  }

  async paymentMethodUsage(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]> {
    const sqlFilters = this.buildPaymentFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT COALESCE(pd.method, 'Sin metodo') AS label,
               COALESCE(SUM(pd.amount), 0)::numeric AS value,
               COUNT(*)::int AS count
        FROM payment_documents pd
        INNER JOIN purchase_orders po ON po.po_id = pd.po_id
        WHERE ${sqlFilters.where.join(" AND ")}
        GROUP BY label
        ORDER BY value DESC
      `,
      sqlFilters.values,
    );
    return rows.map(toSeriesPoint);
  }

  async internalVsInventory(filters: PurchaseDashboardFiltersInput): Promise<PurchaseDashboardSeriesPointOutput[]> {
    const sqlFilters = this.buildPurchaseFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT
          CASE
            WHEN po.requires_stock_entry = true THEN 'Inventario'
            WHEN po.requires_asset_creation = true THEN 'Activo'
            WHEN po.requires_receipt = false THEN 'Interno'
            ELSE 'Servicio'
          END AS label,
          COALESCE(SUM(po.total), 0)::numeric AS value,
          COUNT(*)::int AS count
        FROM purchase_orders po
        WHERE ${sqlFilters.where.join(" AND ")}
        GROUP BY label
        ORDER BY value DESC
      `,
      sqlFilters.values,
    );
    return rows.map(toSeriesPoint);
  }

  private async paymentRows(filters: PurchaseDashboardFiltersInput, statusPredicate: string): Promise<PurchaseDashboardPaymentRowOutput[]> {
    const sqlFilters = this.buildPayableFilters(filters);
    const rows = await this.manager.query(
      `
        SELECT
          ap.account_payable_id::text AS "accountPayableId",
          ap.purchase_id::text AS "purchaseId",
          ap.supplier_id::text AS "supplierId",
          ${supplierNameSql("s")} AS "supplierName",
          ap.due_date::text AS "dueDate",
          ap.amount_pending::numeric AS "amountPending",
          ap.currency AS currency,
          ap.status AS status
        FROM accounts_payable ap
        INNER JOIN purchase_orders po ON po.po_id = ap.purchase_id
        LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
        WHERE ${sqlFilters.where.join(" AND ")} AND (${statusPredicate})
        ORDER BY ap.due_date ASC NULLS LAST, ap.amount_pending DESC
        LIMIT 10
      `,
      sqlFilters.values,
    );
    return rows.map((row: any) => ({
      accountPayableId: row.accountPayableId,
      purchaseId: row.purchaseId,
      supplierId: row.supplierId ?? null,
      supplierName: row.supplierName ?? null,
      dueDate: row.dueDate ?? null,
      amountPending: toNumber(row.amountPending),
      currency: row.currency,
      status: row.status,
    }));
  }

  private buildPurchaseFilters(filters: PurchaseDashboardFiltersInput, offset = 0): SqlFilter {
    const where = ["po.is_active = true"];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      where.push(sql.replace("?", `$${offset + values.length}`));
    };

    if (filters.from) add("DATE(COALESCE(po.date_issue, po.created_at)) >= ?", filters.from);
    if (filters.to) add("DATE(COALESCE(po.date_issue, po.created_at)) <= ?", filters.to);
    if (filters.supplierId) add("po.supplier_id = ?", filters.supplierId);
    if (filters.purchaseType) add("po.purchase_type = ?", filters.purchaseType);
    if (filters.status) add("po.status = ?", filters.status);
    if (filters.paymentStatus) add("po.payment_status = ?", filters.paymentStatus);
    if (filters.userId) add("po.created_by = ?", filters.userId);
    if (filters.warehouseId) add("po.warehouse_id = ?", filters.warehouseId);
    if (filters.paymentMethodId) {
      add("EXISTS (SELECT 1 FROM payment_documents pd_filter WHERE pd_filter.po_id = po.po_id AND pd_filter.payment_method_id = ?)", filters.paymentMethodId);
    }
    if (filters.companyPaymentAccountId) {
      add("EXISTS (SELECT 1 FROM payment_documents pd_account_filter WHERE pd_account_filter.po_id = po.po_id AND pd_account_filter.company_payment_account_id = ?)", filters.companyPaymentAccountId);
    }

    return { where, values };
  }

  private buildPaymentFilters(filters: PurchaseDashboardFiltersInput, offset = 0): SqlFilter {
    const paymentBase = this.buildPaymentBaseFilters(filters, offset);
    return {
      where: [...paymentBase.where, "pd.status = 'APPROVED'"],
      values: paymentBase.values,
    };
  }

  private buildPaymentBaseFilters(filters: PurchaseDashboardFiltersInput, offset = 0): SqlFilter {
    const purchase = this.buildPurchaseFilters(filters, offset);
    const where = [...purchase.where];
    const values = [...purchase.values];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      where.push(sql.replace("?", `$${offset + values.length}`));
    };

    if (filters.paymentMethodId) add("pd.payment_method_id = ?", filters.paymentMethodId);
    if (filters.companyPaymentAccountId) add("pd.company_payment_account_id = ?", filters.companyPaymentAccountId);

    return { where, values };
  }

  private buildPayableFilters(filters: PurchaseDashboardFiltersInput, offset = 0): SqlFilter {
    return this.buildPurchaseFilters(filters, offset);
  }
}

function toNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toSeriesPoint(row: any): PurchaseDashboardSeriesPointOutput {
  return {
    label: row.label ?? "Sin clasificar",
    value: toNumber(row.value),
    count: row.count === undefined ? undefined : toNumber(row.count),
  };
}

function supplierNameSql(alias: string) {
  return `COALESCE(NULLIF(${alias}.trade_name, ''), NULLIF(trim(concat(COALESCE(${alias}.name, ''), ' ', COALESCE(${alias}.last_name, ''))), ''), 'Sin proveedor')`;
}
