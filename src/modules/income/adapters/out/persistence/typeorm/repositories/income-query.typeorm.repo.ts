import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { IncomeFilters } from "src/modules/income/application/dtos/income-filter.input";
import { IncomeListOutput, IncomeOutput, IncomeSummaryOutput } from "src/modules/income/application/dtos/income.output";
import { IncomeQueryRepository } from "src/modules/income/domain/ports/income-query.repository";

const numberFrom = (value: unknown): number => Number(value ?? 0);
const accountLabelSql =
  "COALESCE(cpa.masked_label, cpa.name, cpa.institution_name, cpa.bank_name, cpa.wallet_provider, cpa.wallet_name, 'Sin cuenta')";
const evidenceExistsSql = `EXISTS (SELECT 1 FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF'))`;
const evidenceUrlSql = `COALESCE((SELECT soa.url FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1), NULLIF(sp.payment_photo, ''))`;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`);
const ruleValues = (rule: { values?: string[]; value?: string }) =>
  [...new Set((rule.values?.length ? rule.values : rule.value ? [rule.value] : []).map((value) => value.trim()).filter(Boolean))];

@Injectable()
export class IncomeQueryTypeormRepository implements IncomeQueryRepository {
  constructor(
    @InjectRepository(SalePaymentEntity)
    private readonly paymentRepo: Repository<SalePaymentEntity>,
    @InjectRepository(SaleOrderEntity)
    private readonly orderRepo: Repository<SaleOrderEntity>,
  ) {}

  async list(filters: IncomeFilters): Promise<IncomeListOutput> {
    const qb = this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("sp.id", "incomeId")
        .addSelect("sp.saleOrderId", "saleOrderId")
        .addSelect("so.serie", "saleOrderSerie")
        .addSelect("so.correlative", "saleOrderCorrelative")
        .addSelect("COALESCE(client.fullName, 'Cliente sin nombre')", "clientName")
        .addSelect("sp.amount", "amount")
        .addSelect("sp.method", "method")
        .addSelect("sp.paymentMethodId", "paymentMethodId")
        .addSelect("pm.code", "paymentMethodCode")
        .addSelect("COALESCE(pm.name, sp.method, 'Sin método')", "paymentMethodName")
        .addSelect("sp.companyPaymentAccountId", "companyPaymentAccountId")
        .addSelect(accountLabelSql, "companyPaymentAccountLabel")
        .addSelect("sp.operationNumber", "operationNumber")
        .addSelect("sp.note", "detail")
        .addSelect("sp.date", "date")
        .addSelect("sp.createdAt", "createdAt")
        .addSelect(evidenceUrlSql, "evidenceUrl")
        .addSelect(`(SELECT soa.id FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceId")
        .addSelect(`(SELECT soa.original_name FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceOriginalName")
        .addSelect(`(SELECT soa.mime_type FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceMimeType")
        .addSelect(`(SELECT soa.size_bytes FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceSizeBytes")
        .addSelect(`(SELECT soa.created_at FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceCreatedAt")
        .addSelect("sp.status", "status")
        .addSelect("sp.voidedAt", "voidedAt")
        .addSelect("sp.voidedByUserId", "voidedByUserId")
        .addSelect("sp.voidReason", "voidReason"),
      filters,
    );

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy("sp.date", "DESC")
      .addOrderBy("sp.createdAt", "DESC")
      .offset((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .getRawMany();

    return { items: rows.map(this.mapIncome), total };
  }

  async getSummary(filters: IncomeFilters): Promise<IncomeSummaryOutput> {
    const collectedQb = this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "totalCollected"),
      filters,
    );

    const pendingRows = await this.applyOrderFilters(
      this.orderRepo
        .createQueryBuilder("so")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(
          (subQb) =>
            subQb
              .select("sp.sale_order_id", "saleOrderId")
              .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "collected")
              .from(SalePaymentEntity, "sp")
              .groupBy("sp.sale_order_id"),
          "payments",
          '"payments"."saleOrderId" = so.id',
        )
        .select("COALESCE(SUM(GREATEST(so.total - COALESCE(payments.collected, 0), 0)), 0)", "totalPending")
        .addSelect("COUNT(CASE WHEN GREATEST(so.total - COALESCE(payments.collected, 0), 0) <= 0 THEN 1 END)", "ordersPaid")
        .addSelect("COUNT(CASE WHEN GREATEST(so.total - COALESCE(payments.collected, 0), 0) > 0 THEN 1 END)", "ordersPending"),
      filters,
    ).getRawOne();

    const byMethodRows = await this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("COALESCE(pm.name, sp.method, 'Sin método')", "method")
        .addSelect("sp.paymentMethodId", "paymentMethodId")
        .addSelect("pm.code", "paymentMethodCode")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "amount")
        .addSelect("COUNT(*) FILTER (WHERE sp.status = 'POSTED')", "count")
        .groupBy("pm.name")
        .addGroupBy("sp.method")
        .addGroupBy("sp.paymentMethodId")
        .addGroupBy("pm.code"),
      filters,
    ).getRawMany();

    const byAccountRows = await this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("sp.companyPaymentAccountId", "accountId")
        .addSelect(accountLabelSql, "label")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "amount")
        .addSelect("COUNT(*) FILTER (WHERE sp.status = 'POSTED')", "count")
        .groupBy("sp.companyPaymentAccountId")
        .addGroupBy("cpa.masked_label")
        .addGroupBy("cpa.name")
        .addGroupBy("cpa.institution_name")
        .addGroupBy("cpa.bank_name")
        .addGroupBy("cpa.wallet_provider")
        .addGroupBy("cpa.wallet_name"),
      filters,
    ).getRawMany();

    const collected = await collectedQb.getRawOne();
    const metricQb = this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("COUNT(*) FILTER (WHERE sp.status = 'POSTED')", "postedPaymentsCount")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "postedAmount")
        .addSelect(`COUNT(*) FILTER (WHERE sp.status = 'POSTED' AND (NOT (${evidenceExistsSql}) AND (sp.payment_photo IS NULL OR sp.payment_photo = '') OR sp.operationNumber IS NULL OR sp.operationNumber = '' OR sp.companyPaymentAccountId IS NULL))`, "observedPaymentsCount")
        .addSelect(`COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED' AND (NOT (${evidenceExistsSql}) AND (sp.payment_photo IS NULL OR sp.payment_photo = '') OR sp.operationNumber IS NULL OR sp.operationNumber = '' OR sp.companyPaymentAccountId IS NULL)), 0)`, "observedPaymentsAmount"),
      { ...filters, status: "ALL" },
    );
    const voidedQb = this.applyOrderFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .select("COUNT(*)", "voidedPaymentsCount")
        .addSelect("COALESCE(SUM(sp.amount), 0)", "voidedPaymentsAmount")
        .where("sp.status = 'VOIDED'"),
      filters,
    );
    if (filters.from) voidedQb.andWhere("sp.voidedAt >= :voidedFrom", { voidedFrom: `${filters.from}T00:00:00.000Z` });
    if (filters.to) {
      const toExclusive = new Date(`${filters.to}T00:00:00.000Z`);
      toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
      voidedQb.andWhere("sp.voidedAt < :voidedToExclusive", { voidedToExclusive: toExclusive.toISOString() });
    }
    const metrics = await metricQb.getRawOne();
    const voidedMetrics = await voidedQb.getRawOne();
    const totalCollected = numberFrom(collected?.totalCollected);
    const totalPending = numberFrom(pendingRows?.totalPending);
    const postedPaymentsCount = numberFrom(metrics?.postedPaymentsCount);
    return {
      totalCollected,
      totalPending,
      ordersPaid: numberFrom(pendingRows?.ordersPaid),
      ordersPending: numberFrom(pendingRows?.ordersPending),
      postedPaymentsCount,
      averageCollectedPayment: postedPaymentsCount ? numberFrom(metrics?.postedAmount) / postedPaymentsCount : 0,
      collectionEffectiveness: totalCollected + totalPending > 0 ? (totalCollected / (totalCollected + totalPending)) * 100 : 0,
      observedPaymentsCount: numberFrom(metrics?.observedPaymentsCount),
      observedPaymentsAmount: numberFrom(metrics?.observedPaymentsAmount),
      voidedPaymentsCount: numberFrom(voidedMetrics?.voidedPaymentsCount),
      voidedPaymentsAmount: numberFrom(voidedMetrics?.voidedPaymentsAmount),
      byMethod: byMethodRows.map((row) => ({
        method: row.method,
        paymentMethodId: row.paymentMethodId ?? null,
        paymentMethodCode: row.paymentMethodCode ?? null,
        amount: numberFrom(row.amount),
        count: numberFrom(row.count),
      })),
      byAccount: byAccountRows.map((row) => ({
        accountId: row.accountId ?? null,
        label: row.label,
        amount: numberFrom(row.amount),
        count: numberFrom(row.count),
      })),
    };
  }

  private applyFilters<T>(qb: SelectQueryBuilder<T>, filters: IncomeFilters) {
    this.applyOrderFilters(qb, filters);
    if (filters.status !== "ALL") qb.andWhere("sp.status = :incomeStatus", { incomeStatus: filters.status });
    if (filters.method) qb.andWhere("(pm.code = :method OR sp.method = :method)", { method: filters.method });
    if (filters.companyPaymentAccountId) {
      qb.andWhere("sp.companyPaymentAccountId = :companyPaymentAccountId", {
        companyPaymentAccountId: filters.companyPaymentAccountId,
      });
    }
    if (filters.from) qb.andWhere("sp.date >= :from", { from: `${filters.from}T00:00:00.000Z` });
    if (filters.to) {
      const toExclusive = new Date(`${filters.to}T00:00:00.000Z`);
      toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
      qb.andWhere("sp.date < :toExclusive", { toExclusive: toExclusive.toISOString() });
    }
    if (filters.hasEvidence === true) qb.andWhere(`(${evidenceExistsSql} OR (sp.paymentPhoto IS NOT NULL AND sp.paymentPhoto <> ''))`);
    if (filters.hasEvidence === false) qb.andWhere(`NOT (${evidenceExistsSql}) AND (sp.paymentPhoto IS NULL OR sp.paymentPhoto = '')`);
    for (const [index, rule] of (filters.filters ?? []).entries()) {
      const values = ruleValues(rule);
      const parameter = `incomeRule${index}`;
      if (!values.length) continue;

      if (rule.field === "paymentMethodId") {
        const condition = `sp.paymentMethodId IN (:...${parameter})`;
        qb.andWhere(rule.mode === "exclude" ? `NOT (${condition})` : condition, { [parameter]: values });
      }

      if (rule.field === "companyPaymentAccountId") {
        const unassigned = values.includes("__unassigned__");
        const assigned = values.filter((value) => value !== "__unassigned__");
        const parts = [
          ...(assigned.length ? [`sp.companyPaymentAccountId IN (:...${parameter})`] : []),
          ...(unassigned ? ["sp.companyPaymentAccountId IS NULL"] : []),
        ];
        if (parts.length) {
          const condition = `(${parts.join(" OR ")})`;
          qb.andWhere(rule.mode === "exclude" ? `NOT ${condition}` : condition, { [parameter]: assigned });
        }
      }

      if (rule.field === "detail") {
        const value = escapeLike(values[0]);
        const condition = rule.operator === "eq"
          ? "LOWER(COALESCE(sp.note, '')) = LOWER(:detailValue)"
          : "LOWER(COALESCE(sp.note, '')) LIKE LOWER(:detailValue) ESCAPE '\\'";
        qb.andWhere(condition, { detailValue: rule.operator === "eq" ? value : `%${value}%` });
      }
    }
    return qb;
  }

  private applyOrderFilters<T>(qb: SelectQueryBuilder<T>, filters: IncomeFilters) {
    qb.andWhere("so.isActive = true");
    if (filters.saleOrderId) qb.andWhere("so.id = :saleOrderId", { saleOrderId: filters.saleOrderId });
    if (filters.client) qb.andWhere("client.fullName ILIKE :client", { client: `%${filters.client}%` });
    if (filters.q) {
      const query = filters.q.trim();
      const compact = query.replace(/\s+/g, "");
      const exactNumber = /^\d+$/.test(compact) ? Number(compact) : null;
      const seriesNumber = compact.match(/^([A-Za-z0-9]+)[- ](\d+)$/);
      if (exactNumber !== null && Number.isSafeInteger(exactNumber)) {
        qb.andWhere("so.correlative = :incomeCorrelative", { incomeCorrelative: exactNumber });
      } else if (seriesNumber) {
        qb.andWhere("UPPER(COALESCE(so.serie, '')) = UPPER(:incomeSerie) AND so.correlative = :incomeCorrelative", {
          incomeSerie: seriesNumber[1],
          incomeCorrelative: Number(seriesNumber[2]),
        });
      } else {
        qb.andWhere("CONCAT(COALESCE(so.serie, ''), '-', COALESCE(so.correlative::text, '')) ILIKE :incomeOrderNumber ESCAPE '\\'", {
          incomeOrderNumber: `%${escapeLike(query)}%`,
        });
      }
    }
    return qb;
  }

  private mapIncome(row: any): IncomeOutput {
    const saleOrderNumber = [row.saleOrderSerie, row.saleOrderCorrelative]
      .filter((value) => value !== null && value !== undefined && value !== "")
      .join("-");

    return {
      incomeId: row.incomeId,
      saleOrderId: row.saleOrderId,
      saleOrderNumber: saleOrderNumber || row.saleOrderId,
      clientName: row.clientName,
      amount: numberFrom(row.amount),
      method: row.method,
      paymentMethodId: row.paymentMethodId ?? null,
      paymentMethodCode: row.paymentMethodCode ?? null,
      paymentMethodName: row.paymentMethodName ?? row.method ?? "Sin método",
      companyPaymentAccountId: row.companyPaymentAccountId ?? null,
      companyPaymentAccountLabel: row.companyPaymentAccountLabel ?? null,
      operationNumber: row.operationNumber ?? null,
      detail: row.detail ?? null,
      date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      // List responses never expose private storage keys or attachment metadata.
      // The detail endpoint applies the explicit payments.view_evidence permission.
      evidenceUrl: null,
      evidence: {
        available: Boolean(row.evidenceUrl),
        status: row.evidenceUrl ? "AVAILABLE" : row.status === "VOIDED" ? "MISSING_OPTIONAL" : "MISSING_REQUIRED",
        attachmentId: null,
        url: null,
        originalName: null,
        mimeType: null,
        sizeBytes: null,
        createdAt: null,
        canView: false,
        canUpload: false,
      },
      status: row.status === "VOIDED" ? "VOIDED" : "POSTED",
      voidedAt: row.voidedAt instanceof Date ? row.voidedAt.toISOString() : row.voidedAt ? String(row.voidedAt) : null,
      voidedByUserId: row.voidedByUserId ?? null,
      voidReason: row.voidReason ?? null,
    };
  }
}
