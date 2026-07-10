import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SelectQueryBuilder, Repository } from "typeorm";
import { AccountPayableEntity } from "src/modules/accounts-payable/adapters/out/persistence/typeorm/entities/account-payable.entity";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseOrderItemEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order-item.entity";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { ReceptionStatus } from "src/modules/purchases/domain/value-objects/reception-status";
import { PurchaseDashboardFilters } from "src/modules/purchase-dashboard/application/dtos/purchase-dashboard-filter.input";
import {
  PurchaseDashboardMonthlyPoint,
  PurchaseDashboardPaymentRow,
  PurchaseDashboardSeriesPoint,
  PurchaseDashboardSummaryOutput,
  PurchaseDashboardTopItem,
  PurchaseDashboardTopSupplier,
} from "src/modules/purchase-dashboard/application/dtos/purchase-dashboard.output";
import { PurchaseDashboardQueryRepository } from "src/modules/purchase-dashboard/domain/ports/purchase-dashboard-query.repository";

const numberFrom = (value: unknown): number => Number(value ?? 0);
const limitFrom = (value?: number): number => {
  const limit = Number(value ?? 10);
  if (!Number.isFinite(limit)) return 10;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
};

const uniqueValues = (values?: string[]) => Array.from(new Set((values ?? []).filter(Boolean)));

@Injectable()
export class PurchaseDashboardQueryTypeormRepository implements PurchaseDashboardQueryRepository {
  constructor(
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseRepo: Repository<PurchaseOrderEntity>,
    @InjectRepository(PaymentDocumentEntity)
    private readonly paymentRepo: Repository<PaymentDocumentEntity>,
    @InjectRepository(AccountPayableEntity)
    private readonly payableRepo: Repository<AccountPayableEntity>,
    @InjectRepository(PurchaseOrderItemEntity)
    private readonly itemRepo: Repository<PurchaseOrderItemEntity>,
  ) {}

  private applyPurchaseOrderFilters<T>(qb: SelectQueryBuilder<T>, filters: PurchaseDashboardFilters, alias = "po") {
    qb.andWhere(`${alias}.isActive = true`);
    if (filters.from) qb.andWhere(`COALESCE(${alias}.dateIssue, ${alias}.createdAt) >= :from`, { from: filters.from });
    if (filters.to) qb.andWhere(`COALESCE(${alias}.dateIssue, ${alias}.createdAt) <= :to`, { to: filters.to });
    this.applyStringFilter(qb, `${alias}.supplierId`, "supplierId", "supplierIds", filters.supplierId, filters.supplierIds);
    this.applyStringFilter(qb, `${alias}.purchaseType`, "purchaseType", "purchaseTypes", filters.purchaseType, filters.purchaseTypes);
    if (filters.status) qb.andWhere(`${alias}.status = :status`, { status: filters.status });
    this.applyStringFilter(qb, `${alias}.paymentStatus`, "paymentStatus", "paymentStatuses", filters.paymentStatus, filters.paymentStatuses);
    this.applyStringFilter(qb, `${alias}.createdBy`, "userId", "userIds", filters.userId, filters.userIds);
    this.applyStringFilter(qb, `${alias}.warehouseId`, "warehouseId", "warehouseIds", filters.warehouseId, filters.warehouseIds);
    return qb;
  }

  private applyPaymentDocumentFilters<T>(qb: SelectQueryBuilder<T>, filters: PurchaseDashboardFilters, paymentAlias = "pd") {
    if (filters.from) qb.andWhere(`${paymentAlias}.date >= :from`, { from: filters.from });
    if (filters.to) qb.andWhere(`${paymentAlias}.date <= :to`, { to: filters.to });
    this.applyStringFilter(qb, `${paymentAlias}.paymentMethodId`, "paymentMethodId", "paymentMethodIds", filters.paymentMethodId, filters.paymentMethodIds);
    this.applyStringFilter(
      qb,
      `${paymentAlias}.companyPaymentAccountId`,
      "companyPaymentAccountId",
      "companyPaymentAccountIds",
      filters.companyPaymentAccountId,
      filters.companyPaymentAccountIds,
    );
    return qb;
  }

  private applyStringFilter<T>(
    qb: SelectQueryBuilder<T>,
    column: string,
    parameterName: string,
    listParameterName: string,
    value?: string,
    values?: string[],
  ) {
    const normalizedValues = uniqueValues(values);
    if (normalizedValues.length > 1) {
      qb.andWhere(`${column} IN (:...${listParameterName})`, { [listParameterName]: normalizedValues });
      return;
    }

    const singleValue = normalizedValues[0] ?? value;
    if (singleValue) qb.andWhere(`${column} = :${parameterName}`, { [parameterName]: singleValue });
  }

  private applyApprovedPaymentFilters<T>(qb: SelectQueryBuilder<T>, filters: PurchaseDashboardFilters) {
    return this.applyPaymentDocumentFilters(this.applyPurchaseOrderFilters(qb, filters), filters);
  }

  private applyPayableFilters<T>(qb: SelectQueryBuilder<T>, filters: PurchaseDashboardFilters) {
    return this.applyPurchaseOrderFilters(qb, filters);
  }

  async getSummary(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSummaryOutput> {
    const purchaseQb = this.applyPurchaseOrderFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select("COALESCE(SUM(CASE WHEN po.status != :cancelled THEN po.total ELSE 0 END), 0)", "totalPurchased")
        .addSelect("COUNT(CASE WHEN po.status = :draft THEN 1 END)", "drafts")
        .addSelect("COUNT(CASE WHEN po.approvalStatus = :pendingApproval THEN 1 END)", "toApprove")
        .addSelect("COUNT(CASE WHEN po.receptionStatus = :received THEN 1 END)", "received")
        .setParameters({
          cancelled: PurchaseOrderStatus.CANCELLED,
          draft: PurchaseOrderStatus.DRAFT,
          pendingApproval: "PENDING",
          received: ReceptionStatus.RECEIVED,
        }),
      filters,
    );

    const paymentQb = this.applyPaymentDocumentFilters(
      this.applyPurchaseOrderFilters(
        this.paymentRepo
          .createQueryBuilder("pd")
          .leftJoin(PurchaseOrderEntity, "po", "po.id = pd.poId")
          .select("COALESCE(SUM(CASE WHEN pd.status = :approved THEN pd.amount ELSE 0 END), 0)", "totalPaid")
          .addSelect("COUNT(CASE WHEN pd.status = :pendingPayment THEN 1 END)", "paymentsToApprove")
          .setParameters({ approved: "APPROVED", pendingPayment: "PENDING_APPROVAL" }),
        filters,
      ),
      filters,
    );

    const payableQb = this.applyPayableFilters(
      this.payableRepo
        .createQueryBuilder("ap")
        .leftJoin(PurchaseOrderEntity, "po", "po.id = ap.purchaseId")
        .select("COALESCE(SUM(CASE WHEN ap.status NOT IN (:...closedPayable) THEN ap.amountPending ELSE 0 END), 0)", "pending")
        .addSelect("COALESCE(SUM(CASE WHEN ap.status = :overdue THEN ap.amountPending ELSE 0 END), 0)", "overdue")
        .setParameters({ closedPayable: ["PAID", "CANCELLED"], overdue: "OVERDUE" }),
      filters,
    );

    const [purchaseRaw, paymentRaw, payableRaw] = await Promise.all([
      purchaseQb.getRawOne(),
      paymentQb.getRawOne(),
      payableQb.getRawOne(),
    ]);

    return {
      totalPurchased: numberFrom(purchaseRaw?.totalPurchased),
      totalPaid: numberFrom(paymentRaw?.totalPaid),
      pending: numberFrom(payableRaw?.pending),
      overdue: numberFrom(payableRaw?.overdue),
      drafts: numberFrom(purchaseRaw?.drafts),
      toApprove: numberFrom(purchaseRaw?.toApprove),
      paymentsToApprove: numberFrom(paymentRaw?.paymentsToApprove),
      received: numberFrom(purchaseRaw?.received),
    };
  }

  async getByType(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]> {
    const rows = await this.applyPurchaseOrderFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select("po.purchaseType", "label")
        .addSelect("COALESCE(SUM(po.total), 0)", "value")
        .addSelect("COUNT(*)", "count")
        .groupBy("po.purchaseType")
        .orderBy("value", "DESC"),
      filters,
    ).getRawMany();
    return rows.map((row) => ({ label: row.label, value: numberFrom(row.value), count: numberFrom(row.count) }));
  }

  async getByStatus(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]> {
    const rows = await this.applyPurchaseOrderFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select("po.paymentStatus", "label")
        .addSelect("COALESCE(SUM(po.total), 0)", "value")
        .addSelect("COUNT(*)", "count")
        .groupBy("po.paymentStatus")
        .orderBy("value", "DESC"),
      filters,
    ).getRawMany();
    return rows.map((row) => ({ label: row.label, value: numberFrom(row.value), count: numberFrom(row.count) }));
  }

  async getMonthlySpending(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardMonthlyPoint[]> {
    const purchaseRows = await this.applyPurchaseOrderFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select("TO_CHAR(DATE_TRUNC('month', po.createdAt), 'YYYY-MM')", "month")
        .addSelect("COALESCE(SUM(po.total), 0)", "purchased")
        .groupBy("DATE_TRUNC('month', po.createdAt)")
        .orderBy("month", "ASC"),
      filters,
    ).getRawMany();

    const paymentRows = await this.applyApprovedPaymentFilters(
      this.paymentRepo
        .createQueryBuilder("pd")
        .leftJoin(PurchaseOrderEntity, "po", "po.id = pd.poId")
        .select("TO_CHAR(DATE_TRUNC('month', pd.date), 'YYYY-MM')", "month")
        .addSelect("COALESCE(SUM(pd.amount), 0)", "paid")
        .where("pd.status = :approved", { approved: "APPROVED" })
        .groupBy("DATE_TRUNC('month', pd.date)")
        .orderBy("month", "ASC"),
      filters,
    ).getRawMany();

    const byMonth = new Map<string, PurchaseDashboardMonthlyPoint>();
    for (const row of purchaseRows) {
      byMonth.set(row.month, { month: row.month, purchased: numberFrom(row.purchased), paid: 0 });
    }
    for (const row of paymentRows) {
      const current = byMonth.get(row.month) ?? { month: row.month, purchased: 0, paid: 0 };
      current.paid = numberFrom(row.paid);
      byMonth.set(row.month, current);
    }
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }

  async getUpcomingPayments(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardPaymentRow[]> {
    const today = new Date().toISOString().slice(0, 10);
    const qb = this.payableBaseRows(filters)
      .andWhere("ap.amountPending > 0")
      .andWhere("ap.status IN (:...statuses)", { statuses: ["PENDING", "PARTIAL"] })
      .andWhere("(ap.dueDate IS NULL OR ap.dueDate >= :today)", { today });
    const rows = await qb.orderBy("ap.dueDate", "ASC", "NULLS LAST").limit(limitFrom(filters.limit)).getRawMany();
    return rows.map(this.mapPaymentRow);
  }

  async getOverduePayments(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardPaymentRow[]> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.payableBaseRows(filters)
      .andWhere("ap.amountPending > 0")
      .andWhere("(ap.status = :overdue OR ap.dueDate < :today)", { overdue: "OVERDUE", today })
      .orderBy("ap.dueDate", "ASC", "NULLS LAST")
      .limit(limitFrom(filters.limit))
      .getRawMany();
    return rows.map(this.mapPaymentRow);
  }

  async getTopItems(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardTopItem[]> {
    const rows = await this.applyPurchaseOrderFilters(
      this.itemRepo
        .createQueryBuilder("item")
        .leftJoin(PurchaseOrderEntity, "po", "po.id = item.poId")
        .leftJoin("pc_stock_items", "psi", "psi.stock_item_id = item.stock_item_id")
        .leftJoin("pc_skus", "sku", "sku.sku_id = psi.sku_id")
        .leftJoin("pc_products", "product", "product.product_id = sku.product_id")
        .select("COALESCE(item.stock_item_id, item.internal_material_id, item.asset_category_id)::text", "itemId")
        .addSelect(
          `
            COALESCE(
              NULLIF(trim(item.service_name), ''),
              NULLIF(trim(item.description), ''),
              NULLIF(sku.name, ''),
              NULLIF(product.name, ''),
              item.stock_item_id::text,
              item.internal_material_id::text,
              item.asset_category_id::text,
              'Sin nombre'
            )
          `,
          "label",
        )
        .addSelect("item.item_type", "itemType")
        .addSelect("COALESCE(SUM(item.purchase_value), 0)", "total")
        .addSelect("COALESCE(SUM(item.quantity), 0)", "quantity")
        .groupBy('"itemId"')
        .addGroupBy("label")
        .addGroupBy("item.service_name")
        .addGroupBy("item.description")
        .addGroupBy("sku.name")
        .addGroupBy("product.name")
        .addGroupBy("item.stock_item_id")
        .addGroupBy("item.internal_material_id")
        .addGroupBy("item.asset_category_id")
        .addGroupBy("item.item_type")
        .orderBy("total", "DESC")
        .limit(limitFrom(filters.limit)),
      filters,
    ).getRawMany();
    return rows.map((row) => ({
      itemId: row.itemId ?? null,
      label: row.label ?? row.itemType,
      itemType: row.itemType,
      total: numberFrom(row.total),
      quantity: numberFrom(row.quantity),
    }));
  }

  async getTopSuppliers(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardTopSupplier[]> {
    const rows = await this.applyPurchaseOrderFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .leftJoin("suppliers", "s", "s.supplier_id = po.supplierId")
        .select("po.supplierId", "supplierId")
        .addSelect("COALESCE(s.trade_name, CONCAT_WS(' ', s.name, s.last_name), 'Proveedor sin nombre')", "supplierName")
        .addSelect("COALESCE(SUM(po.total), 0)", "total")
        .addSelect("COUNT(*)", "count")
        .groupBy("po.supplierId")
        .addGroupBy("s.trade_name")
        .addGroupBy("s.name")
        .addGroupBy("s.last_name")
        .orderBy("total", "DESC")
        .limit(limitFrom(filters.limit)),
      filters,
    ).getRawMany();
    return rows.map((row) => ({
      supplierId: row.supplierId ?? null,
      supplierName: row.supplierName,
      total: numberFrom(row.total),
      count: numberFrom(row.count),
    }));
  }

  async getPaymentMethodUsage(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]> {
    const rows = await this.applyApprovedPaymentFilters(
      this.paymentRepo
        .createQueryBuilder("pd")
        .leftJoin(PurchaseOrderEntity, "po", "po.id = pd.poId")
        .leftJoin("payment_methods", "pm", "pm.method_id = pd.paymentMethodId")
        .select("COALESCE(pm.name, pd.method, 'Sin metodo')", "label")
        .addSelect("COALESCE(SUM(pd.amount), 0)", "value")
        .addSelect("COUNT(*)", "count")
        .where("pd.status = :approved", { approved: "APPROVED" })
        .groupBy("pm.name")
        .addGroupBy("pd.method")
        .orderBy("value", "DESC"),
      filters,
    ).getRawMany();
    return rows.map((row) => ({ label: row.label, value: numberFrom(row.value), count: numberFrom(row.count) }));
  }

  async getInternalVsInventory(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]> {
    const rows = await this.applyPurchaseOrderFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select(
          "CASE WHEN po.requiresStockEntry = true THEN 'Inventario' WHEN po.requiresAssetCreation = true THEN 'Activo' WHEN po.requiresReceipt = false THEN 'Interno' ELSE 'Servicio' END",
          "label",
        )
        .addSelect("COALESCE(SUM(po.total), 0)", "value")
        .addSelect("COUNT(*)", "count")
        .groupBy("label")
        .orderBy("value", "DESC"),
      filters,
    ).getRawMany();
    return rows.map((row) => ({ label: row.label, value: numberFrom(row.value), count: numberFrom(row.count) }));
  }

  private payableBaseRows(filters: PurchaseDashboardFilters) {
    return this.applyPayableFilters(
      this.payableRepo
        .createQueryBuilder("ap")
        .leftJoin(PurchaseOrderEntity, "po", "po.id = ap.purchaseId")
        .leftJoin("suppliers", "s", "s.supplier_id = ap.supplierId")
        .select("ap.id", "accountPayableId")
        .addSelect("ap.purchaseId", "purchaseId")
        .addSelect("ap.supplierId", "supplierId")
        .addSelect("COALESCE(s.trade_name, CONCAT_WS(' ', s.name, s.last_name))", "supplierName")
        .addSelect("ap.dueDate", "dueDate")
        .addSelect("ap.amountPending", "amountPending")
        .addSelect("ap.currency", "currency")
        .addSelect("ap.status", "status"),
      filters,
    );
  }

  private mapPaymentRow(row: any): PurchaseDashboardPaymentRow {
    return {
      accountPayableId: row.accountPayableId,
      purchaseId: row.purchaseId,
      supplierId: row.supplierId ?? null,
      supplierName: row.supplierName ?? null,
      dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : null,
      amountPending: numberFrom(row.amountPending),
      currency: row.currency,
      status: row.status,
    };
  }
}
