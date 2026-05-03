import { BadRequestException, Inject } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";
import { sanitizePurchaseSearchFilters } from "../../support/purchase-search.utils";
import { XlsxBuilderService, type XlsxColumn } from "src/shared/application/services/xlsx-builder.service";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";

type ExportColumnDefinition = {
  key: string;
  label: string;
  map: (row: ExportRowContext) => unknown;
};

type ExportRowContext = ReturnType<typeof PurchaseOrderOutputMapper.toOrderOutput> & {
  totalPaid: number;
  totalToPay: number;
  skuCodes: string[];
  skuNames: string[];
  skuQuantities: number[];
  skuItems: Array<{ skuCode: string; skuName: string; quantity: number }>;
};

const EXPORT_COLUMNS: ExportColumnDefinition[] = [
  { key: "dateIssue", label: "Fecha emision", map: (row) => row.dateIssue },
  { key: "numero", label: "Numero compra", map: (row) => [row.serie, row.correlative].filter(Boolean).join("-") },
  { key: "supplierName", label: "Proveedor", map: (row) => row.supplierName ?? "" },
  { key: "supplierDocumentNumber", label: "Documento proveedor", map: (row) => row.supplierDocumentNumber ?? "" },
  { key: "warehouseName", label: "Almacen", map: (row) => row.warehouseName ?? "" },
  { key: "documentType", label: "Tipo documento", map: (row) => row.documentType ?? "" },
  { key: "paymentForm", label: "Forma pago", map: (row) => row.paymentForm ?? "" },
  { key: "currency", label: "Moneda", map: (row) => row.currency ?? "" },
  { key: "purchaseValue", label: "Valor compra", map: (row) => row.purchaseValue ?? 0 },
  { key: "totalIgv", label: "IGV", map: (row) => row.totalIgv ?? 0 },
  { key: "total", label: "Total", map: (row) => row.total ?? 0 },
  { key: "totalPaid", label: "Total pagado", map: (row) => row.totalPaid ?? 0 },
  { key: "totalToPay", label: "Total por pagar", map: (row) => row.totalToPay ?? 0 },
  { key: "status", label: "Estado", map: (row) => row.status ?? "" },
  { key: "expectedAt", label: "Fecha ingreso almacen", map: (row) => row.expectedAt },
  { key: "dateExpiration", label: "Fecha vencimiento", map: (row) => row.dateExpiration },
  { key: "createdAt", label: "Fecha creacion", map: (row) => row.createdAt },
  { key: "skuCodes", label: "Codigos SKU", map: (row) => row.skuCodes.join(", ") },
  { key: "skuNames", label: "Nombres SKU", map: (row) => row.skuNames.join(", ") },
  { key: "skuQuantities", label: "Cantidades SKU", map: (row) => row.skuQuantities.join(", ") },
  { key: "skuItems", label: "SKUs comprados", map: (row) => row.skuItems },
  { key: "note", label: "Nota", map: (row) => row.note ?? "" },
];

export type ExportPurchaseOrdersInput = {
  columns: Array<{ key: string; label: string }>;
  q?: string;
  filters?: Record<string, unknown>[];
  from?: string;
  to?: string;
  useDateRange?: boolean;
};

export class ExportPurchaseOrdersExcelUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  getAvailableColumns(): Array<{ key: string; label: string }> {
    return EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label }));
  }

  async execute(input: ExportPurchaseOrdersInput): Promise<{ filename: string; content: Buffer }> {
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

    const safeFilters = sanitizePurchaseSearchFilters(input.filters as any);
    const { items } = await this.purchaseRepo.list({
      q: input.q,
      filters: safeFilters,
      from: input.useDateRange && input.from ? ParseDateLocal(input.from, "start") : undefined,
      to: input.useDateRange && input.to ? ParseDateLocal(input.to, "end") : undefined,
      page: 1,
      limit: 20000,
    });

    const rows = await Promise.all(items.map(async (item) => {
      const mapped = PurchaseOrderOutputMapper.toOrderOutput(item.order, {
        supplierName: item.supplierName,
        supplierDocumentNumber: item.supplierDocumentNumber,
        warehouseName: item.warehouseName,
      });
      const purchaseItems = await this.itemRepo.getByPurchaseId(item.order.poId, item.order.currency ?? CurrencyType.PEN);
      const skuRows = await Promise.all(purchaseItems.map(async (purchaseItem) => {
        const stockItem = await this.stockItemRepo.findById(purchaseItem.stockItemId);
        if (!stockItem) return null;
        const skuInfo = await this.skuRepo.findById(stockItem.skuId);
        if (!skuInfo?.sku) return null;
        const skuCode = skuInfo.sku.customSku || skuInfo.sku.backendSku || skuInfo.sku.id || "";
        const skuName = skuInfo.sku.name || "";
        return {
          skuCode,
          skuName,
          quantity: purchaseItem.quantity,
        };
      }));
      const skuItems = skuRows.filter(Boolean) as Array<{ skuCode: string; skuName: string; quantity: number }>;
      const row: ExportRowContext = {
        ...mapped,
        totalPaid: item.totalPaid,
        totalToPay: (mapped.total ?? 0) - item.totalPaid,
        skuCodes: skuItems.map((entry) => entry.skuCode).filter(Boolean),
        skuNames: skuItems.map((entry) => entry.skuName).filter(Boolean),
        skuQuantities: skuItems.map((entry) => entry.quantity),
        skuItems,
      };
      const output: Record<string, unknown> = {};
      selected.forEach(({ requested, source }) => {
        output[requested.key] = source.map(row);
      });
      return output;
    }));

    const excelColumns: XlsxColumn[] = selected.map(({ requested }) => ({
      key: requested.key,
      header: requested.label,
    }));
    const builder = new XlsxBuilderService();
    const content = await builder.build({
      sheetName: "Compras",
      columns: excelColumns,
      rows,
    });

    const filename = `compras-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { filename, content };
  }
}
