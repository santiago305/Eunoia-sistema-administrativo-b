import { BadRequestException, Inject } from "@nestjs/common";
import { XlsxBuilderService, type XlsxColumn } from "src/shared/application/services/xlsx-builder.service";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";
import { sanitizeRecurringPurchaseSearchFilters } from "../support/recurring-purchase-search.utils";

type ExportColumnDefinition = {
  key: string;
  label: string;
  map: (row: ReturnType<typeof toRecurringPurchaseOutput>) => unknown;
};

const EXPORT_COLUMNS: ExportColumnDefinition[] = [
  { key: "name", label: "Nombre", map: (row) => row.name },
  { key: "description", label: "Descripcion", map: (row) => row.description ?? "" },
  { key: "supplierId", label: "Proveedor ID", map: (row) => row.supplierId },
  { key: "frequency", label: "Frecuencia", map: (row) => row.frequency },
  { key: "purchaseType", label: "Tipo de compra", map: (row) => row.purchaseType },
  { key: "currency", label: "Moneda", map: (row) => row.currency },
  { key: "amount", label: "Importe", map: (row) => row.amount },
  { key: "startDate", label: "Fecha inicio", map: (row) => row.startDate },
  { key: "nextDueDate", label: "Proximo vencimiento", map: (row) => row.nextDueDate },
  { key: "billingAnchorDay", label: "Dia de facturacion", map: (row) => row.billingAnchorDay },
  { key: "status", label: "Estado", map: (row) => row.status },
  { key: "reminderDaysBefore", label: "Dias de recordatorio", map: (row) => row.reminderDaysBefore.join(", ") },
  { key: "lastGeneratedPeriodKey", label: "Ultimo periodo generado", map: (row) => row.lastGeneratedPeriodKey ?? "" },
  { key: "lastGeneratedAt", label: "Ultima generacion", map: (row) => row.lastGeneratedAt ?? "" },
  { key: "lastGeneratedPurchaseId", label: "Ultima compra generada", map: (row) => row.lastGeneratedPurchaseId ?? "" },
  { key: "lastGeneratedAccountPayableId", label: "Ultima cuenta por pagar", map: (row) => row.lastGeneratedAccountPayableId ?? "" },
  { key: "createdAt", label: "Fecha creacion", map: (row) => row.createdAt ?? "" },
  { key: "updatedAt", label: "Fecha actualizacion", map: (row) => row.updatedAt ?? "" },
];

export type ExportRecurringPurchasesInput = {
  columns: Array<{ key: string; label: string }>;
  q?: string;
  filters?: Record<string, unknown>[];
};

export class ExportRecurringPurchasesExcelUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly recurringPurchaseRepo: RecurringPurchaseTemplateRepository,
  ) {}

  getAvailableColumns(): Array<{ key: string; label: string }> {
    return EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label }));
  }

  async execute(input: ExportRecurringPurchasesInput): Promise<{ filename: string; content: Buffer }> {
    if (!input.columns?.length) {
      throw new BadRequestException("Debes seleccionar al menos una columna");
    }

    const columnMap = new Map(EXPORT_COLUMNS.map((column) => [column.key, column]));
    const selected = input.columns
      .map((column) => ({ requested: column, source: columnMap.get(column.key) }))
      .filter((item): item is { requested: { key: string; label: string }; source: ExportColumnDefinition } =>
        Boolean(item.source),
      );

    if (!selected.length) {
      throw new BadRequestException("No hay columnas validas para exportar");
    }

    const safeFilters = sanitizeRecurringPurchaseSearchFilters(input.filters as any);
    const { items } = await this.recurringPurchaseRepo.list({
      q: input.q,
      filters: safeFilters,
      page: 1,
      limit: 20000,
    });

    const rows = items.map((item) => {
      const mapped = toRecurringPurchaseOutput(item);
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
    const builder = new XlsxBuilderService();
    const content = await builder.build({
      sheetName: "Compras recurrentes",
      columns: excelColumns,
      rows,
    });

    const filename = `compras-recurrentes-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { filename, content };
  }
}
