import { BadRequestException, Inject } from "@nestjs/common";
import { XlsxBuilderService, type XlsxColumn } from "src/shared/application/services/xlsx-builder.service";
import { IncomeFilterInput, normalizeIncomeFilters } from "../dtos/income-filter.input";
import { IncomeOutput } from "../dtos/income.output";
import { INCOME_QUERY_REPOSITORY, IncomeQueryRepository } from "../../domain/ports/income-query.repository";

const MAX_EXPORT_ROWS = 20_000;

type IncomeExportColumn = { key: string; header: string; value: (income: IncomeOutput) => unknown };

const STATUS_LABELS: Record<IncomeOutput["status"], string> = {
  PENDING_CONFIRMATION: "Por confirmar",
  POSTED: "Contabilizado",
  CANCELLED: "Cancelado",
  REVERSED: "Revertido",
};

const RECONCILIATION_LABELS: Record<IncomeOutput["reconciliationStatus"], string> = {
  UNRECONCILED: "Sin conciliar",
  PARTIALLY_RECONCILED: "Conciliación parcial",
  RECONCILED: "Conciliado",
};

const EXPORT_COLUMNS: IncomeExportColumn[] = [
  { key: "paymentDate", header: "Fecha de pago", value: (row) => row.paymentDate },
  { key: "accountingDate", header: "Fecha contable", value: (row) => row.accountingDate ?? "" },
  { key: "saleOrderNumber", header: "Pedido", value: (row) => row.saleOrderNumber },
  { key: "clientName", header: "Cliente", value: (row) => row.clientName },
  { key: "detail", header: "Descripción", value: (row) => row.detail ?? "" },
  { key: "operationNumber", header: "Número de operación", value: (row) => row.operationNumber ?? "" },
  { key: "paymentMethod", header: "Método de cobro", value: (row) => row.paymentMethodName },
  { key: "receiverAccount", header: "Cuenta receptora", value: (row) => row.companyPaymentAccountLabel ?? "" },
  { key: "amount", header: "Importe recibido", value: (row) => row.amount },
  { key: "currency", header: "Moneda", value: (row) => row.currency },
  { key: "appliedAmount", header: "Importe aplicado", value: (row) => row.appliedAmount },
  { key: "customerCreditBalance", header: "Saldo a favor neto", value: (row) => row.customerCreditBalance },
  { key: "financialStatus", header: "Estado financiero", value: (row) => STATUS_LABELS[row.status] },
  { key: "reconciliationStatus", header: "Estado de conciliación", value: (row) => row.status === "POSTED" ? RECONCILIATION_LABELS[row.reconciliationStatus] : "No aplica" },
  { key: "reconciledAmount", header: "Importe conciliado", value: (row) => row.status === "POSTED" ? row.reconciledAmount : 0 },
  { key: "evidence", header: "Evidencia", value: (row) => row.evidence.available ? "Con evidencia" : "Sin evidencia" },
  { key: "postedAt", header: "Fecha de contabilización", value: (row) => row.postedAt ?? "" },
  { key: "financialReason", header: "Motivo financiero", value: (row) => row.financialReason ?? "" },
];

export type ExportIncomeInput = Pick<IncomeFilterInput, "from" | "to" | "q" | "filters" | "status" | "hasEvidence" | "scopeUserId" | "scopeCompanyId" | "scopeSubsidiaryIds" | "scopeAccountIds" | "scopeClientIds"> & {
  columns: Array<{ key: string }>;
};

export class ExportIncomeExcelUsecase {
  constructor(
    @Inject(INCOME_QUERY_REPOSITORY)
    private readonly incomeRepo: IncomeQueryRepository,
  ) {}

  getAvailableColumns() {
    return EXPORT_COLUMNS.map(({ key, header }) => ({ key, label: header }));
  }

  async execute(input: ExportIncomeInput): Promise<{ filename: string; content: Buffer }> {
    if (!input.columns?.length) throw new BadRequestException("Selecciona al menos una columna para exportar.");
    const byKey = new Map(EXPORT_COLUMNS.map((column) => [column.key, column]));
    const selected = [...new Set(input.columns.map((column) => column.key))]
      .map((key) => byKey.get(key))
      .filter((column): column is IncomeExportColumn => Boolean(column));
    if (!selected.length) throw new BadRequestException("No hay columnas válidas para exportar.");

    const filters = { ...normalizeIncomeFilters(input), page: 1, limit: MAX_EXPORT_ROWS };
    const result = await this.incomeRepo.list(filters);
    if (result.total > MAX_EXPORT_ROWS) {
      throw new BadRequestException(`La exportación supera el límite de ${MAX_EXPORT_ROWS} filas. Reduce el período o agrega filtros.`);
    }

    const rows = result.items.map((income) => Object.fromEntries(selected.map((column) => [column.key, column.value(income)])));
    const columns: XlsxColumn[] = selected.map((column) => ({ key: column.key, header: column.header }));
    const content = await new XlsxBuilderService().build({ sheetName: "Ingresos", columns, rows });
    return { filename: `ingresos-${new Date().toISOString().slice(0, 10)}.xlsx`, content };
  }
}
