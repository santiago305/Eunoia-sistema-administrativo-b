import { BadRequestException, Inject } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../ports/production-order.repository";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { XlsxBuilderService, type XlsxColumn } from "src/shared/application/services/xlsx-builder.service";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { ProductionOrderOutputMapper } from "../../mappers/production-order-output.mapper";

type ExportProductionColumn = { key: string; label: string };

type ExportRow = {
  number: string;
  reference: string;
  status: string;
  createdBy: string;
  fromWarehouse: string;
  toWarehouse: string;
  manufactureDate: unknown;
  createdAt: unknown;
  productCodes: string[];
  productNames: string[];
  productsProduced: Array<{ skuCode: string; skuName: string; quantity: number; wasteQty: number }>;
};

const AVAILABLE_COLUMNS: ExportProductionColumn[] = [
  { key: "number", label: "Numero" },
  { key: "reference", label: "Referencia" },
  { key: "status", label: "Estado" },
  { key: "createdBy", label: "Creado por" },
  { key: "fromWarehouse", label: "Almacen origen" },
  { key: "toWarehouse", label: "Almacen destino" },
  { key: "manufactureDate", label: "Fecha produccion" },
  { key: "createdAt", label: "Fecha creacion" },
  { key: "productCodes", label: "Codigos SKU" },
  { key: "productNames", label: "Nombres SKU" },
  { key: "productsProduced", label: "Productos producidos" },
];

export type ExportProductionInput = {
  columns: ExportProductionColumn[];
  q?: string;
  filters?: Record<string, unknown>[];
  from?: string;
  to?: string;
  useDateRange?: boolean;
};

export class ExportProductionOrdersExcelUsecase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  getAvailableColumns() {
    return AVAILABLE_COLUMNS;
  }

  async execute(input: ExportProductionInput): Promise<{ filename: string; content: Buffer }> {
    if (!input.columns?.length) {
      throw new BadRequestException("Debes seleccionar al menos una columna");
    }
    const columns = input.columns.filter((col) => AVAILABLE_COLUMNS.some((av) => av.key === col.key));
    if (!columns.length) {
      throw new BadRequestException("No hay columnas validas para exportar");
    }

    const result = await this.orderRepo.list({
      q: input.q,
      filters: (input.filters as any) ?? [],
      from: input.useDateRange && input.from ? ParseDateLocal(input.from, "start") : undefined,
      to: input.useDateRange && input.to ? ParseDateLocal(input.to, "end") : undefined,
      page: 1,
      limit: 10000,
    });

    const rows: Record<string, unknown>[] = await Promise.all(result.items.map(async (item) => {
      const full = await this.orderRepo.getByIdWithItems(item.order.productionId);
      const produced = await Promise.all((full?.items ?? []).map(async (productionItem) => {
        const stockItem = await this.stockItemRepo.findById(productionItem.finishedItemId);
        if (!stockItem) return null;
        const sku = await this.skuRepo.findById(stockItem.skuId);
        if (!sku?.sku) return null;
        const skuCode = sku.sku.customSku || sku.sku.backendSku || sku.sku.id || "";
        const skuName = sku.sku.name || "";
        return {
          skuCode,
          skuName,
          quantity: productionItem.quantity,
          wasteQty: productionItem.wasteQty ?? 0,
        };
      }));
      const productsProduced = produced.filter(Boolean) as ExportRow["productsProduced"];
      const mapped = ProductionOrderOutputMapper.toListItemOutput(item);
      const row: ExportRow = {
        number: `${mapped.serie?.code ?? ""}-${mapped.correlative ?? ""}`,
        reference: mapped.reference ?? "",
        status: mapped.status ?? "",
        createdBy: mapped.createdByName ?? "",
        fromWarehouse: mapped.fromWarehouse?.name ?? "",
        toWarehouse: mapped.toWarehouse?.name ?? "",
        manufactureDate: mapped.manufactureDate,
        createdAt: mapped.createdAt,
        productCodes: productsProduced.map((entry) => entry.skuCode).filter(Boolean),
        productNames: productsProduced.map((entry) => entry.skuName).filter(Boolean),
        productsProduced,
      };
      const output: Record<string, unknown> = {};
      columns.forEach((column) => {
        const value = (row as Record<string, unknown>)[column.key];
        output[column.key] = Array.isArray(value) ? JSON.stringify(value) : value;
      });
      return output;
    }));

    const xlsxColumns: XlsxColumn[] = columns.map((column) => ({
      key: column.key,
      header: column.label,
    }));
    const content = await new XlsxBuilderService().build({
      sheetName: "Produccion",
      columns: xlsxColumns,
      rows,
    });

    return {
      filename: `produccion-${new Date().toISOString().slice(0, 10)}.xlsx`,
      content,
    };
  }
}
