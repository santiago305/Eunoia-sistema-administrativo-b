import { BadRequestException, Inject } from "@nestjs/common";
import { XlsxBuilderService, type XlsxColumn } from "src/shared/application/services/xlsx-builder.service";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository, type ListPaymentDocumentsParams } from "src/modules/payments/domain/ports/payment-document.repository";
import { PaymentOutputMapper } from "../../mappers/payment-output.mapper";
import { sanitizePaymentSearchFilters } from "../../support/payment-search.utils";
import { PaymentSearchFields, PaymentSearchOperators, type PaymentSearchRule } from "../../dtos/payment-search/payment-search-snapshot";

type ExportColumnDefinition = {
  key: string;
  label: string;
  map: (row: ReturnType<typeof PaymentOutputMapper.toOutput>) => unknown;
};

const EXPORT_COLUMNS: ExportColumnDefinition[] = [
  { key: "status", label: "Estado", map: (row) => row.status ?? "" },
  { key: "poId", label: "Compra", map: (row) => row.poId ?? "" },
  { key: "accountPayableId", label: "Cuenta por pagar", map: (row) => row.accountPayableId ?? "" },
  { key: "method", label: "Metodo", map: (row) => row.method ?? "" },
  { key: "paymentMethodId", label: "Metodo de pago", map: (row) => row.paymentMethodId ?? "" },
  { key: "companyPaymentAccount", label: "Cuenta empresa", map: (row) => row.companyPaymentAccountMaskedLabel ?? "" },
  { key: "amount", label: "Monto", map: (row) => row.amount ?? 0 },
  { key: "currency", label: "Moneda", map: (row) => row.currency ?? "" },
  { key: "date", label: "Fecha documento", map: (row) => row.date },
  { key: "scheduledAt", label: "Fecha programada", map: (row) => row.scheduledAt },
  { key: "paidAt", label: "Fecha pagada", map: (row) => row.paidAt },
  { key: "requestedByUserId", label: "Solicitante", map: (row) => row.requestedByUserId ?? "" },
  { key: "approvedByUserId", label: "Aprobador", map: (row) => row.approvedByUserId ?? "" },
  { key: "hasEvidence", label: "Evidencia", map: (row) => row.hasEvidence ? "Con evidencia" : "Sin evidencia" },
  { key: "operationNumber", label: "Operacion", map: (row) => row.operationNumber ?? row.operationCode ?? "" },
  { key: "rejectionReason", label: "Motivo rechazo", map: (row) => row.rejectionReason ?? "" },
  { key: "note", label: "Nota", map: (row) => row.note ?? "" },
];

export type ExportPaymentsInput = {
  columns: Array<{ key: string; label: string }>;
  q?: string;
  filters?: Record<string, unknown>[];
};

function applyRange(params: ListPaymentDocumentsParams, keyFrom: keyof ListPaymentDocumentsParams, keyTo: keyof ListPaymentDocumentsParams, rule: PaymentSearchRule) {
  if (rule.operator === PaymentSearchOperators.BETWEEN && rule.range?.start && rule.range?.end) {
    (params as Record<string, unknown>)[keyFrom] = rule.range.start;
    (params as Record<string, unknown>)[keyTo] = rule.range.end;
    return;
  }
  if (!rule.value) return;
  if (rule.operator === PaymentSearchOperators.ON || rule.operator === PaymentSearchOperators.ON_OR_AFTER || rule.operator === PaymentSearchOperators.AFTER) {
    (params as Record<string, unknown>)[keyFrom] = rule.value;
  }
  if (rule.operator === PaymentSearchOperators.ON || rule.operator === PaymentSearchOperators.ON_OR_BEFORE || rule.operator === PaymentSearchOperators.BEFORE) {
    (params as Record<string, unknown>)[keyTo] = rule.value;
  }
}

function buildListParams(q?: string, filters?: Record<string, unknown>[]): ListPaymentDocumentsParams {
  const params: ListPaymentDocumentsParams = {
    q: q?.trim() || undefined,
    page: 1,
    limit: 20000,
  };

  sanitizePaymentSearchFilters(filters as unknown as PaymentSearchRule[]).forEach((rule) => {
    if (rule.operator === PaymentSearchOperators.IN) {
      const values = rule.values ?? [];
      if (!values.length || rule.mode === "exclude") return;
      if (rule.field === PaymentSearchFields.STATUS) params.statuses = values as ListPaymentDocumentsParams["statuses"];
      if (rule.field === PaymentSearchFields.CURRENCY) params.currency = values[0] as ListPaymentDocumentsParams["currency"];
      if (rule.field === PaymentSearchFields.PAYMENT_METHOD_ID) params.paymentMethodIds = values;
      if (rule.field === PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID) params.companyPaymentAccountIds = values;
      if (rule.field === PaymentSearchFields.FROM_DOCUMENT_TYPE) params.fromDocumentType = values[0] as ListPaymentDocumentsParams["fromDocumentType"];
      if (rule.field === PaymentSearchFields.HAS_EVIDENCE) params.hasEvidence = values[0] === "true";
      if (rule.field === PaymentSearchFields.REQUESTED_BY_USER_ID) params.requestedByUserId = values[0];
      if (rule.field === PaymentSearchFields.APPROVED_BY_USER_ID) params.approvedByUserId = values[0];
      return;
    }

    if (rule.field === PaymentSearchFields.AMOUNT && rule.value) {
      if (
        rule.operator === PaymentSearchOperators.EQ ||
        rule.operator === PaymentSearchOperators.GTE ||
        rule.operator === PaymentSearchOperators.GT
      ) params.amountMin = Number(rule.value);
      if (
        rule.operator === PaymentSearchOperators.EQ ||
        rule.operator === PaymentSearchOperators.LTE ||
        rule.operator === PaymentSearchOperators.LT
      ) params.amountMax = Number(rule.value);
      return;
    }

    if (rule.field === PaymentSearchFields.DATE) applyRange(params, "dateFrom", "dateTo", rule);
    if (rule.field === PaymentSearchFields.SCHEDULED_AT) applyRange(params, "scheduledFrom", "scheduledTo", rule);
    if (rule.field === PaymentSearchFields.PAID_AT) applyRange(params, "paidFrom", "paidTo", rule);
  });

  return params;
}

export class ExportPaymentsExcelUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentRepo: PaymentDocumentRepository,
  ) {}

  getAvailableColumns(): Array<{ key: string; label: string }> {
    return EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label }));
  }

  async execute(input: ExportPaymentsInput): Promise<{ filename: string; content: Buffer }> {
    if (!input.columns?.length) {
      throw new BadRequestException("Debes seleccionar al menos una columna");
    }

    const columnMap = new Map(EXPORT_COLUMNS.map((column) => [column.key, column]));
    const selected = input.columns
      .map((column) => ({ requested: column, source: columnMap.get(column.key) }))
      .filter((item): item is { requested: { key: string; label: string }; source: ExportColumnDefinition } => Boolean(item.source));

    if (!selected.length) {
      throw new BadRequestException("No hay columnas validas para exportar");
    }

    const { items } = await this.paymentRepo.list(buildListParams(input.q, input.filters));
    const rows = items.map((payment) => {
      const mapped = PaymentOutputMapper.toOutput(payment);
      const output: Record<string, unknown> = {};
      selected.forEach(({ requested, source }) => {
        output[requested.key] = source.map(mapped);
      });
      return output;
    });

    const excelColumns: XlsxColumn[] = selected.map(({ requested }) => ({
      key: requested.key,
      header: requested.label,
    }));
    const content = await new XlsxBuilderService().build({
      sheetName: "Pagos",
      columns: excelColumns,
      rows,
    });

    return {
      filename: `pagos-${new Date().toISOString().slice(0, 10)}.xlsx`,
      content,
    };
  }
}
