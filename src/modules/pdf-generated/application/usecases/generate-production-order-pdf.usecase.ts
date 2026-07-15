import { BadRequestException, Inject } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PDF_RENDERER, PdfRendererPort } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";
import { GenerateProductionOrderPdfInput } from "../dtos/production-order/input/generate-production-order.input";
import { ProductionOrderPdfData } from "../../domain/interfaces/production-data";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/product-catalog/integration/inventory/ports/stock-item.repository.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/application/ports/warehouse.repository.port";
import { PdfGeneratedValidationError } from "../errors/pdf-generated-validation.error";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { resolvePublicAssetUrl } from "../support/resolve-public-asset-url";

const formatUnitLabel = (code?: string | null, name?: string | null) => {
  const label = [code, name].filter(Boolean).join(" - ");
  return label || "N/A";
};

const formatNameWithSku = (name: string, sku?: string | null) => (sku ? `${name} (${sku})` : name);

export class GenerateProductionOrderPdfUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly productionRepo: ProductionOrderRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly productCatalogStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly productCatalogSkuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productCatalogProductRepo: ProductCatalogProductRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GenerateProductionOrderPdfInput): Promise<Buffer> {
    const result = await this.productionRepo.getByIdWithItems(input.productionId);
    if (!result) {
      throw new BadRequestException(new PdfGeneratedValidationError("Orden de producción no encontrada").message);
    }

    const { order, items, serie } = result;

    const [company, fromWarehouse, toWarehouse] = await Promise.all([
      this.companyRepo.findSingle(),
      order.fromWarehouseId ? this.warehouseRepo.findById(new WarehouseId(order.fromWarehouseId)) : null,
      order.toWarehouseId ? this.warehouseRepo.findById(new WarehouseId(order.toWarehouseId)) : null,
    ]);
    if (!company) {
      throw new BadRequestException(new PdfGeneratedValidationError("Compañía inválida").message);
    }
    if (!fromWarehouse) {
      throw new BadRequestException(new PdfGeneratedValidationError("Almacén de origen inválido").message);
    }
    if (!toWarehouse) {
      throw new BadRequestException(new PdfGeneratedValidationError("Almacén de destino inválido").message);
    }

    const mappedItems = await Promise.all(
      items.map(async (item) => {
        const stockItem =
          (await this.stockItemRepo.findById(item.finishedItemId)) ??
          (await this.stockItemRepo.findByProductOrStockItemId(item.finishedItemId));
        let description = item.finishedItemId;
        let unit = "N/A";
        const skuStockItem = stockItem ? null : await this.productCatalogStockItemRepo.findById(item.finishedItemId);

        if (stockItem?.type === StockItemType.PRODUCT && stockItem.productId) {
          description = formatNameWithSku(`PRODUCT ${stockItem.productId}`, null);
        }

        if (skuStockItem) {
          const sku = await this.productCatalogSkuRepo.findById(skuStockItem.skuId);
          const product = sku ? await this.productCatalogProductRepo.findById(sku.sku.productId) : null;
          if (sku) {
            description = formatNameWithSku(
              `${product?.name ?? sku.sku.name} - ${sku.sku.name}`,
              sku.sku.backendSku ?? sku.sku.customSku ?? null,
            );
            unit = "SKU";
          }
        }

        const rawUnitCost = Number(item.unitCost ?? 0);
        const unitCost = Number.isFinite(rawUnitCost) ? rawUnitCost : 0;
        const total = unitCost * item.quantity;

        return {
          description,
          unit,
          quantity: item.quantity,
          unitCost,
          total,
        };
      }),
    );

    const totalCost = mappedItems.reduce((sum, row) => sum + row.total, 0);

    const companyAddress = company?.address || [
      company?.department,
      company?.province,
      company?.district,
    ].filter(Boolean).join(" - ");

    const numberRaw = order.correlative !== undefined ? String(order.correlative) : undefined;
    const paddedNumber =
      numberRaw && serie?.padding ? numberRaw.padStart(serie.padding, "0") : numberRaw;

    const data: ProductionOrderPdfData = {
      company: {
        name: company?.name ?? "N/A",
        ruc: company?.ruc ?? undefined,
        address: companyAddress || undefined,
        logoUrl: await resolvePublicAssetUrl(company?.logoPath ?? undefined),
      },
      order: {
        documentType: "ORDEN DE PRODUCCION",
        serie: serie?.code ?? undefined,
        number: paddedNumber ?? undefined,
        issuedAt: order.createdAt ?? undefined,
        manufactureDate: order.manufactureDate ?? undefined,
        status: order.status ?? undefined,
        reference: order.reference ?? undefined,
        fromWarehouse: fromWarehouse?.name ?? undefined,
        toWarehouse: toWarehouse?.name ?? undefined,
      },
      items: mappedItems,
      totals: {
        totalCost,
      },
    };

    return this.pdfRenderer.renderProductionOrder(data);
  }
}





