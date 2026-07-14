import { BadRequestException, Inject } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import {
  SaleOrderListItemOutput,
  SaleOrderSearchFields,
  SaleOrderSearchRule,
} from "../../dtos/sale-order-search/sale-order-search-snapshot";
import { sanitizeSaleOrderSearchSnapshot } from "../../support/sale-order-search.utils";
import { XlsxBuilderService, type XlsxColumn } from "src/shared/application/services/xlsx-builder.service";

type ExportColumnDefinition = {
  key: string;
  label: string;
  map: (row: ExportRowContext) => unknown;
};

type ExportRowContext = SaleOrderListItemOutput & {
  discount?: number | null;
};

const TOOLBAR_DATE_FIELDS = new Set<string>([
  SaleOrderSearchFields.CREATED_AT,
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
]);

const orderNumber = (row: SaleOrderListItemOutput) =>
  [row.serie, row.correlative].filter((value) => value !== null && value !== undefined && value !== "").join("-");

const EXPORT_COLUMNS: ExportColumnDefinition[] = [
  { key: "number", label: "Numero", map: orderNumber },
  { key: "clientName", label: "Cliente", map: (row) => row.client?.fullName ?? "" },
  { key: "clientDocumentNumber", label: "Documento cliente", map: (row) => row.client?.docNumber ?? "" },
  { key: "clientPhone", label: "Celular", map: (row) => row.client?.mainPhone ?? "" },
  { key: "clientDepartment", label: "Departamento", map: (row) => row.client?.department?.name ?? "" },
  { key: "clientProvince", label: "Provincia", map: (row) => row.client?.province?.name ?? "" },
  { key: "clientDistrict", label: "Distrito", map: (row) => row.client?.district?.name ?? "" },
  { key: "agencyDetail", label: "Agencia/Direccion", map: (row) => row.agencyDetail ?? "" },
  { key: "warehouseName", label: "Almacen", map: (row) => row.warehouse?.name ?? "" },
  { key: "sourceName", label: "Origen", map: (row) => row.source?.name ?? "" },
  { key: "workflowName", label: "Tipo", map: (row) => row.workflow?.name ?? "" },
  { key: "currentStateName", label: "Estado", map: (row) => row.currentState?.name ?? "" },
  { key: "paymentStatus", label: "Estado de pago", map: (row) => row.paymentStatus ?? "" },
  { key: "invoiceStatus", label: "Comprobante", map: (row) => (row.invoiceSend ? "Enviado" : "Pendiente") },
  { key: "scheduleDate", label: "Fecha agenda", map: (row) => row.scheduleDate ?? "" },
  { key: "deliveryDate", label: "Fecha entrega", map: (row) => row.deliveryDate ?? "" },
  { key: "createdAt", label: "Fecha creacion", map: (row) => row.createdAt ?? "" },
  { key: "subTotal", label: "Subtotal", map: (row) => row.subTotal ?? 0 },
  { key: "deliveryCost", label: "Costo envio", map: (row) => row.deliveryCost ?? 0 },
  { key: "discount", label: "Descuento", map: (row) => row.discount ?? 0 },
  { key: "total", label: "Total", map: (row) => row.total ?? 0 },
  { key: "totalPaid", label: "Total pagado", map: (row) => row.totalPaid ?? 0 },
  { key: "totalToPay", label: "Total por cobrar", map: (row) => row.pendingAmount ?? 0 },
  { key: "assignedByName", label: "Asignado a", map: (row) => row.assignedBy?.name ?? row.assignedBy?.email ?? "" },
  { key: "createdByName", label: "Creado por", map: (row) => row.createdBy?.name ?? row.createdBy?.email ?? "" },
  { key: "advertisingCode", label: "Codigo publicitario", map: (row) => row.advertisingCode ?? "" },
  { key: "note", label: "Nota", map: (row) => row.note ?? "" },
  { key: "observation", label: "Observacion", map: (row) => row.observation ?? "" },
];

export type ExportSaleOrdersInput = {
  columns: Array<{ key: string; label: string }>;
  q?: string;
  filters?: Record<string, unknown>[];
  useDateRange?: boolean;
};

export class ExportSaleOrdersExcelUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  getAvailableColumns(): Array<{ key: string; label: string }> {
    return EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label }));
  }

  async execute(input: ExportSaleOrdersInput): Promise<{ filename: string; content: Buffer }> {
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

    const snapshot = sanitizeSaleOrderSearchSnapshot({
      q: input.q,
      filters: input.filters as unknown as SaleOrderSearchRule[],
    });
    const filters = input.useDateRange === false
      ? snapshot.filters.filter((rule) => !TOOLBAR_DATE_FIELDS.has(rule.field))
      : snapshot.filters;

    const { items } = await this.saleOrderRepo.list({
      q: snapshot.q,
      filters,
      page: 1,
      limit: 20000,
    });

    const rows = items.map((item) => {
      const output: Record<string, unknown> = {};
      selected.forEach(({ requested, source }) => {
        output[requested.key] = source.map(item);
      });
      return output;
    });

    const excelColumns: XlsxColumn[] = selected.map(({ requested }) => ({
      key: requested.key,
      header: requested.label,
      format: requested.key === "number" ? "text" : undefined,
    }));
    const builder = new XlsxBuilderService();
    const content = await builder.build({
      sheetName: "Pedidos",
      columns: excelColumns,
      rows,
    });

    const filename = `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { filename, content };
  }
}
