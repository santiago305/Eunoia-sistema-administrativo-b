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
const ownEvidenceExistsSql = `(
  EXISTS (SELECT 1 FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF'))
  OR NULLIF(sp.payment_photo, '') IS NOT NULL
 )`;
const inheritedEvidenceExistsSql = `(sp.corrected_from_payment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM sale_payments original
    WHERE original.id = sp.corrected_from_payment_id AND (
      NULLIF(original.payment_photo, '') IS NOT NULL
      OR EXISTS (SELECT 1 FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = original.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF'))
    )
  ))`;
const evidenceExistsSql = `(${ownEvidenceExistsSql} OR ${inheritedEvidenceExistsSql})`;
const reconciledAmountSql = `COALESCE((SELECT SUM(bra.amount) FROM bank_reconciliation_allocations bra WHERE bra.sale_payment_id = sp.id AND bra.unreconciled_at IS NULL), 0)`;
const appliedAmountSql = `COALESCE((SELECT SUM(spa.amount) FROM sale_payment_allocations spa WHERE spa.sale_payment_id = sp.id), 0)`;
const customerCreditBalanceSql = `COALESCE((SELECT SUM(ccm.amount) FROM customer_credit_movements ccm WHERE ccm.sale_payment_id = sp.id), 0)`;
const evidenceUrlSql = `COALESCE(
  (SELECT soa.url FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1),
  NULLIF(sp.payment_photo, ''),
  (SELECT soa.url FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.corrected_from_payment_id AND sp.corrected_from_payment_id IS NOT NULL AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1),
  (SELECT NULLIF(original.payment_photo, '') FROM sale_payments original WHERE original.id = sp.corrected_from_payment_id)
)`;
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
        .addSelect("sp.currency", "currency")
        .addSelect("sp.method", "method")
        .addSelect("sp.paymentMethodId", "paymentMethodId")
        .addSelect("pm.code", "paymentMethodCode")
        .addSelect("COALESCE(pm.name, sp.method, 'Sin método')", "paymentMethodName")
        .addSelect("sp.companyPaymentAccountId", "companyPaymentAccountId")
        .addSelect(accountLabelSql, "companyPaymentAccountLabel")
        .addSelect("sp.operationNumber", "operationNumber")
        .addSelect("sp.note", "detail")
        .addSelect("sp.paymentDate", "date")
        .addSelect("sp.paymentDate", "paymentDate")
        .addSelect("sp.createdAt", "createdAt")
        .addSelect("sp.version", "version")
        .addSelect("sp.createdByUserId", "createdByUserId")
        .addSelect("sp.updatedByUserId", "updatedByUserId")
        .addSelect(evidenceUrlSql, "evidenceUrl")
        .addSelect(`NOT ${ownEvidenceExistsSql} AND ${inheritedEvidenceExistsSql}`, "evidenceInherited")
        .addSelect(`(SELECT soa.id FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceId")
        .addSelect(`(SELECT soa.original_name FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceOriginalName")
        .addSelect(`(SELECT soa.mime_type FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceMimeType")
        .addSelect(`(SELECT soa.size_bytes FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceSizeBytes")
        .addSelect(`(SELECT soa.created_at FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.deleted_at IS NULL AND soa.type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') ORDER BY soa.created_at DESC LIMIT 1)`, "evidenceCreatedAt")
        .addSelect("sp.status", "status")
        .addSelect("sp.correctedFromPaymentId", "correctedFromPaymentId")
        .addSelect("sp.financialReason", "financialReason")
        .addSelect("sp.postedAt", "postedAt")
        .addSelect("sp.postedByUserId", "postedByUserId")
        .addSelect(appliedAmountSql, "appliedAmount")
        .addSelect(customerCreditBalanceSql, "customerCreditBalance")
        .addSelect(reconciledAmountSql, "reconciledAmount")
        .addSelect("sp.accountingDate", "accountingDate")
        .addSelect("sp.voidedAt", "voidedAt")
        .addSelect("sp.voidedByUserId", "voidedByUserId")
        .addSelect("sp.voidReason", "voidReason"),
      filters,
    );

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy("sp.paymentDate", "DESC")
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
        .select("sp.currency", "currency")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "totalCollected")
        .groupBy("sp.currency"),
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
              .addSelect("sp.currency", "currency")
              .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "collected")
              .from(SalePaymentEntity, "sp")
              .groupBy("sp.sale_order_id")
              .addGroupBy("sp.currency"),
          "payments",
          '"payments"."saleOrderId" = so.id AND "payments"."currency" = so.currency',
        )
        .select("so.currency", "currency")
        .addSelect("COALESCE(SUM(GREATEST(so.total - COALESCE(payments.collected, 0), 0)), 0)", "totalPending")
        .addSelect("COUNT(CASE WHEN GREATEST(so.total - COALESCE(payments.collected, 0), 0) <= 0 THEN 1 END)", "ordersPaid")
        .addSelect("COUNT(CASE WHEN GREATEST(so.total - COALESCE(payments.collected, 0), 0) > 0 THEN 1 END)", "ordersPending")
        .groupBy("so.currency"),
      filters,
    ).getRawMany();

    const byMethodRows = await this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("COALESCE(pm.name, sp.method, 'Sin método')", "method")
        .addSelect("sp.currency", "currency")
        .addSelect("sp.paymentMethodId", "paymentMethodId")
        .addSelect("pm.code", "paymentMethodCode")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "amount")
        .addSelect("COUNT(*) FILTER (WHERE sp.status = 'POSTED')", "count")
        .groupBy("pm.name")
        .addGroupBy("sp.currency")
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
        .addSelect("sp.currency", "currency")
        .addSelect(accountLabelSql, "label")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "amount")
        .addSelect("COUNT(*) FILTER (WHERE sp.status = 'POSTED')", "count")
        .groupBy("sp.companyPaymentAccountId")
        .addGroupBy("sp.currency")
        .addGroupBy("cpa.masked_label")
        .addGroupBy("cpa.name")
        .addGroupBy("cpa.institution_name")
        .addGroupBy("cpa.bank_name")
        .addGroupBy("cpa.wallet_provider")
        .addGroupBy("cpa.wallet_name"),
      filters,
    ).getRawMany();

    const collectedRows = await collectedQb.getRawMany();
    const metricQb = this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
        .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
        .select("sp.currency", "currency")
        .addSelect("COUNT(*) FILTER (WHERE sp.status = 'POSTED')", "postedPaymentsCount")
        .addSelect("COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED'), 0)", "postedAmount")
        .addSelect(`COUNT(*) FILTER (WHERE sp.status = 'POSTED' AND (NOT (${evidenceExistsSql}) AND (sp.payment_photo IS NULL OR sp.payment_photo = '') OR sp.operationNumber IS NULL OR sp.operationNumber = '' OR sp.companyPaymentAccountId IS NULL))`, "observedPaymentsCount")
        .addSelect(`COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'POSTED' AND (NOT (${evidenceExistsSql}) AND (sp.payment_photo IS NULL OR sp.payment_photo = '') OR sp.operationNumber IS NULL OR sp.operationNumber = '' OR sp.companyPaymentAccountId IS NULL)), 0)`, "observedPaymentsAmount"),
      { ...filters, status: "ALL" },
    ).groupBy("sp.currency");
    const voidedQb = this.applyOrderFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .select("COUNT(*)", "voidedPaymentsCount")
        .addSelect("sp.currency", "currency")
        .addSelect("COALESCE(SUM(sp.amount), 0)", "voidedPaymentsAmount")
        .where("sp.status IN ('CANCELLED', 'REVERSED')")
        .groupBy("sp.currency"),
      filters,
    );
    if (filters.from) voidedQb.andWhere("sp.voidedAt >= :voidedFrom", { voidedFrom: `${filters.from}T00:00:00.000Z` });
    if (filters.to) {
      const toExclusive = new Date(`${filters.to}T00:00:00.000Z`);
      toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
      voidedQb.andWhere("sp.voidedAt < :voidedToExclusive", { voidedToExclusive: toExclusive.toISOString() });
    }
    const [metricsRows, voidedMetricsRows] = await Promise.all([metricQb.getRawMany(), voidedQb.getRawMany()]);
    const ordersPaid = pendingRows.reduce((sum, row) => sum + numberFrom(row.ordersPaid), 0);
    const ordersPending = pendingRows.reduce((sum, row) => sum + numberFrom(row.ordersPending), 0);
    const postedPaymentsCount = metricsRows.reduce((sum, row) => sum + numberFrom(row.postedPaymentsCount), 0);
    const currencyCodes = new Set<string>([
      ...collectedRows.map((row) => row.currency ?? "PEN"),
      ...pendingRows.map((row) => row.currency ?? "PEN"),
      ...metricsRows.map((row) => row.currency ?? "PEN"),
      ...voidedMetricsRows.map((row) => row.currency ?? "PEN"),
    ]);
    const currencyMetrics = [...currencyCodes].sort().map((currency) => {
      const collectedRow = collectedRows.find((row) => (row.currency ?? "PEN") === currency);
      const pendingRow = pendingRows.find((row) => (row.currency ?? "PEN") === currency);
      const metricsRow = metricsRows.find((row) => (row.currency ?? "PEN") === currency);
      const voidedRow = voidedMetricsRows.find((row) => (row.currency ?? "PEN") === currency);
      const currencyCollected = numberFrom(collectedRow?.totalCollected);
      const currencyPending = numberFrom(pendingRow?.totalPending);
      const currencyPostedCount = numberFrom(metricsRow?.postedPaymentsCount);
      return {
        currency,
        totalCollected: currencyCollected,
        totalPending: currencyPending,
        ordersPaid: numberFrom(pendingRow?.ordersPaid),
        ordersPending: numberFrom(pendingRow?.ordersPending),
        postedPaymentsCount: currencyPostedCount,
        averageCollectedPayment: currencyPostedCount ? numberFrom(metricsRow?.postedAmount) / currencyPostedCount : 0,
        collectionEffectiveness: currencyCollected + currencyPending > 0 ? (currencyCollected / (currencyCollected + currencyPending)) * 100 : 0,
        observedPaymentsCount: numberFrom(metricsRow?.observedPaymentsCount),
        observedPaymentsAmount: numberFrom(metricsRow?.observedPaymentsAmount),
        voidedPaymentsCount: numberFrom(voidedRow?.voidedPaymentsCount),
        voidedPaymentsAmount: numberFrom(voidedRow?.voidedPaymentsAmount),
      };
    });
    const scalarCurrencyMetrics = currencyMetrics.length === 1 ? currencyMetrics[0] : null;
    const scalarAmount = (select: (metric: (typeof currencyMetrics)[number]) => number) =>
      scalarCurrencyMetrics ? select(scalarCurrencyMetrics) : currencyMetrics.length === 0 ? 0 : null;
    return {
      // Legacy scalar fields are only meaningful when the result contains one currency.
      // Consumers handling multiple currencies must use currencyMetrics.
      totalCollected: scalarAmount((metric) => metric.totalCollected),
      totalPending: scalarAmount((metric) => metric.totalPending),
      ordersPaid,
      ordersPending,
      postedPaymentsCount,
      averageCollectedPayment: scalarAmount((metric) => metric.averageCollectedPayment),
      collectionEffectiveness: scalarAmount((metric) => metric.collectionEffectiveness),
      observedPaymentsCount: metricsRows.reduce((sum, row) => sum + numberFrom(row.observedPaymentsCount), 0),
      observedPaymentsAmount: scalarAmount((metric) => metric.observedPaymentsAmount),
      voidedPaymentsCount: voidedMetricsRows.reduce((sum, row) => sum + numberFrom(row.voidedPaymentsCount), 0),
      voidedPaymentsAmount: scalarAmount((metric) => metric.voidedPaymentsAmount),
      currencyMetrics,
      customerCreditByCurrency: await this.applyFilters(
        this.paymentRepo
          .createQueryBuilder("sp")
          .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
          .leftJoin(ClientEntity, "client", "client.id = so.clientId")
          .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.companyPaymentAccountId")
          .leftJoin(PaymentMethodEntity, "pm", "pm.method_id = sp.paymentMethodId")
          .select("sp.currency", "currency")
          .addSelect(`COALESCE(SUM(GREATEST(${customerCreditBalanceSql}, 0)) FILTER (WHERE sp.status = 'POSTED'), 0)`, "availableAmount")
          .addSelect(`COUNT(*) FILTER (WHERE sp.status = 'POSTED' AND ${customerCreditBalanceSql} > 0)`, "incomesCount")
          .groupBy("sp.currency"),
        filters,
      ).getRawMany().then((rows) => rows.map((row) => ({
        currency: row.currency ?? "PEN",
        availableAmount: numberFrom(row.availableAmount),
        incomesCount: numberFrom(row.incomesCount),
      }))),
      byMethod: byMethodRows.map((row) => ({
        currency: row.currency ?? "PEN",
        method: row.method,
        paymentMethodId: row.paymentMethodId ?? null,
        paymentMethodCode: row.paymentMethodCode ?? null,
        amount: numberFrom(row.amount),
        count: numberFrom(row.count),
      })),
      byAccount: byAccountRows.map((row) => ({
        currency: row.currency ?? "PEN",
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
    if (filters.from) qb.andWhere("sp.paymentDate >= :from", { from: filters.from });
    if (filters.to) qb.andWhere("sp.paymentDate <= :to", { to: filters.to });
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

      if (rule.field === "reconciliationStatus") {
        const conditions: Record<string, string> = {
          UNRECONCILED: `sp.status = 'POSTED' AND ${reconciledAmountSql} = 0`,
          PARTIALLY_RECONCILED: `sp.status = 'POSTED' AND ${reconciledAmountSql} > 0 AND ${reconciledAmountSql} < sp.amount`,
          RECONCILED: `sp.status = 'POSTED' AND ${reconciledAmountSql} >= sp.amount`,
        };
        const selected = values.map((value) => conditions[value]).filter(Boolean);
        if (selected.length) {
          const condition = `(${selected.join(" OR ")})`;
          qb.andWhere(rule.mode === "exclude" ? `NOT ${condition}` : condition);
        }
      }

      if (rule.field === "customerCreditStatus") {
        const conditions: Record<string, string> = {
          HAS_BALANCE: `sp.status = 'POSTED' AND ${customerCreditBalanceSql} > 0`,
          NO_BALANCE: `sp.status = 'POSTED' AND ${customerCreditBalanceSql} <= 0`,
        };
        const selected = values.map((value) => conditions[value]).filter(Boolean);
        if (selected.length) {
          const condition = `(${selected.join(" OR ")})`;
          qb.andWhere(rule.mode === "exclude" ? `NOT ${condition}` : condition);
        }
      }
    }
    return qb;
  }

  private applyOrderFilters<T>(qb: SelectQueryBuilder<T>, filters: IncomeFilters) {
    if (filters.scopeCompanyId) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM company_payment_accounts scoped_company_account
         WHERE scoped_company_account.company_payment_account_id = sp.company_payment_account_id
           AND scoped_company_account.company_id = :incomeScopeCompanyId
      )`, { incomeScopeCompanyId: filters.scopeCompanyId });
    }
    if (filters.scopeUserId) {
      const assigned: string[] = [];
      const parameters: Record<string, unknown> = { incomeScopeUserId: filters.scopeUserId };
      if (filters.scopeSubsidiaryIds?.length) {
        assigned.push("so.agencySubsidiaryId IN (:...incomeScopeSubsidiaryIds)");
        parameters.incomeScopeSubsidiaryIds = filters.scopeSubsidiaryIds;
      }
      if (filters.scopeClientIds?.length) {
        assigned.push("so.clientId IN (:...incomeScopeClientIds)");
        parameters.incomeScopeClientIds = filters.scopeClientIds;
      }
      const paymentAssigned = filters.scopeAccountIds?.length
        ? " OR scoped_payment.company_payment_account_id IN (:...incomeScopeAccountIds)"
        : "";
      if (filters.scopeAccountIds?.length) parameters.incomeScopeAccountIds = filters.scopeAccountIds;
      qb.andWhere(
        `(so.createdBy = :incomeScopeUserId${assigned.length ? ` OR ${assigned.join(" OR ")}` : ""} OR EXISTS (
          SELECT 1 FROM sale_payments scoped_payment
           WHERE scoped_payment.sale_order_id = so.id
             AND (scoped_payment.created_by_user_id = :incomeScopeUserId
                  OR scoped_payment.updated_by_user_id = :incomeScopeUserId${paymentAssigned})
        ))`,
        parameters,
      );
    }
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
      currency: row.currency ?? "PEN",
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
        status: row.evidenceUrl ? "AVAILABLE" : ["CANCELLED", "REVERSED"].includes(row.status) ? "MISSING_OPTIONAL" : "MISSING_REQUIRED",
        attachmentId: null,
        url: null,
        originalName: null,
        mimeType: null,
        sizeBytes: null,
        createdAt: null,
        canView: false,
        canUpload: false,
        inherited: Boolean(row.evidenceInherited),
      },
      status: row.status,
      correctedFromPaymentId: row.correctedFromPaymentId ?? null,
      financialReason: row.financialReason ?? null,
      postedAt: row.postedAt instanceof Date ? row.postedAt.toISOString() : row.postedAt ? String(row.postedAt) : null,
      postedByUserId: row.postedByUserId ?? null,
      appliedAmount: numberFrom(row.appliedAmount ?? 0),
      customerCreditBalance: numberFrom(row.customerCreditBalance ?? 0),
      reconciledAmount: numberFrom(row.reconciledAmount ?? 0),
      reconciliationStatus: numberFrom(row.reconciledAmount ?? 0) <= 0
        ? "UNRECONCILED"
        : numberFrom(row.reconciledAmount ?? 0) >= numberFrom(row.amount) ? "RECONCILED" : "PARTIALLY_RECONCILED",
      accountingDate: row.accountingDate ? String(row.accountingDate).slice(0, 10) : null,
      version: Number(row.version ?? 1),
      paymentDate: String(row.paymentDate ?? row.date).slice(0, 10),
      createdByUserId: row.createdByUserId ?? null,
      updatedByUserId: row.updatedByUserId ?? null,
      voidedAt: row.voidedAt instanceof Date ? row.voidedAt.toISOString() : row.voidedAt ? String(row.voidedAt) : null,
      voidedByUserId: row.voidedByUserId ?? null,
      voidReason: row.voidReason ?? null,
    };
  }
}
