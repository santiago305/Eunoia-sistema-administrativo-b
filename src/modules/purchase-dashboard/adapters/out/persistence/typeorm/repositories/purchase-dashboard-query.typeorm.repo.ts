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
const limitFrom = (value?: number): number => Math.min(Math.max(Number(value ?? 10), 1), 50);

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

  private applyPurchaseFilters<T>(qb: SelectQueryBuilder<T>, filters: PurchaseDashboardFilters, alias = "po") {
    if (filters.from) qb.andWhere(`${alias}.createdAt >= :from`, { from: filters.from });
    if (filters.to) qb.andWhere(`${alias}.createdAt <= :to`, { to: filters.to });
    if (filters.supplierId) qb.andWhere(`${alias}.supplierId = :supplierId`, { supplierId: filters.supplierId });
    if (filters.purchaseType) qb.andWhere(`${alias}.purchaseType = :purchaseType`, { purchaseType: filters.purchaseType });
    if (filters.status) qb.andWhere(`${alias}.status = :status`, { status: filters.status });
    if (filters.paymentStatus) qb.andWhere(`${alias}.paymentStatus = :paymentStatus`, { paymentStatus: filters.paymentStatus });
    if (filters.userId) qb.andWhere(`${alias}.createdBy = :userId`, { userId: filters.userId });
    if (filters.warehouseId) qb.andWhere(`${alias}.warehouseId = :warehouseId`, { warehouseId: filters.warehouseId });
    return qb;
  }

  private applyPaymentFilters<T>(qb: SelectQueryBuilder<T>, filters: PurchaseDashboardFilters, dateAlias = "pd") {
    if (filters.from) qb.andWhere(`${dateAlias}.date >= :from`, { from: filters.from });
    if (filters.to) qb.andWhere(`${dateAlias}.date <= :to`, { to: filters.to });
    if (filters.paymentMethodId) qb.andWhere(`${dateAlias}.paymentMethodId = :paymentMethodId`, { paymentMethodId: filters.paymentMethodId });
    if (filters.companyPaymentAccountId) {
      qb.andWhere(`${dateAlias}.companyPaymentAccountId = :companyPaymentAccountId`, {
        companyPaymentAccountId: filters.companyPaymentAccountId,
      });
    }
    return qb;
  }

  async getSummary(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSummaryOutput> {
    const purchaseQb = this.applyPurchaseFilters(
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

    const paymentQb = this.applyPaymentFilters(
      this.applyPurchaseFilters(
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

    const payableQb = this.applyPurchaseFilters(
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
    const rows = await this.applyPurchaseFilters(
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
    const rows = await this.applyPurchaseFilters(
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
    const purchaseRows = await this.applyPurchaseFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select("TO_CHAR(DATE_TRUNC('month', po.createdAt), 'YYYY-MM')", "month")
        .addSelect("COALESCE(SUM(po.total), 0)", "purchased")
        .groupBy("DATE_TRUNC('month', po.createdAt)")
        .orderBy("month", "ASC"),
      filters,
    ).getRawMany();

    const paymentRows = await this.applyPaymentFilters(
      this.applyPurchaseFilters(
        this.paymentRepo
          .createQueryBuilder("pd")
          .leftJoin(PurchaseOrderEntity, "po", "po.id = pd.poId")
          .select("TO_CHAR(DATE_TRUNC('month', pd.date), 'YYYY-MM')", "month")
          .addSelect("COALESCE(SUM(pd.amount), 0)", "paid")
          .where("pd.status = :approved", { approved: "APPROVED" })
          .groupBy("DATE_TRUNC('month', pd.date)")
          .orderBy("month", "ASC"),
        filters,
      ),
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
    const qb = this.payableBaseRows(filters)
      .andWhere("ap.amountPending > 0")
      .andWhere("ap.status IN (:...statuses)", { statuses: ["PENDING", "PARTIAL"] });
    if (filters.to) qb.andWhere("ap.dueDate <= :dueTo", { dueTo: filters.to.toISOString().slice(0, 10) });
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
    const rows = await this.applyPurchaseFilters(
      this.itemRepo
        .createQueryBuilder("item")
        .leftJoin(PurchaseOrderEntity, "po", "po.id = item.poId")
        .select("item.stockItemId", "itemId")
        .addSelect("COALESCE(item.serviceName, item.description, item.itemType)", "label")
        .addSelect("item.itemType", "itemType")
        .addSelect("COALESCE(SUM(item.purchaseValue), 0)", "total")
        .addSelect("COALESCE(SUM(item.quantity), 0)", "quantity")
        .groupBy("item.stockItemId")
        .addGroupBy("item.serviceName")
        .addGroupBy("item.description")
        .addGroupBy("item.itemType")
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
    const rows = await this.applyPurchaseFilters(
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
    const rows = await this.applyPaymentFilters(
      this.applyPurchaseFilters(
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
      ),
      filters,
    ).getRawMany();
    return rows.map((row) => ({ label: row.label, value: numberFrom(row.value), count: numberFrom(row.count) }));
  }

  async getInternalVsInventory(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]> {
    const rows = await this.applyPurchaseFilters(
      this.purchaseRepo
        .createQueryBuilder("po")
        .select(
          "CASE WHEN po.requiresStockEntry = true THEN 'Inventario' WHEN po.requiresAssetCreation = true THEN 'Activo fijo' ELSE 'Interno/servicio' END",
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
    return this.applyPurchaseFilters(
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
