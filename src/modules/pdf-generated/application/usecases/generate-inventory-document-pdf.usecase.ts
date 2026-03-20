import { BadRequestException, Inject } from "@nestjs/common";
import { join } from "path";
import { pathToFileURL } from "url";
import sharp from "sharp";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/domain/ports/document.repository.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/inventory/domain/ports/document-series.repository.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";
import { StockItem } from "src/modules/inventory/domain/entities/stock-item/stock-item";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { ProductWithUnitInfo } from "src/modules/catalog/domain/read-models/product-with-unit-info.rm";
import { ProductVariantWithProductInfo } from "src/modules/catalog/domain/read-models/product-variant-with-product-info.rm";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PDF_RENDERER, PdfRendererPort } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";
import { GenerateInventoryDocumentPdfInput } from "../dtos/inventory-document/input/generate-inventory-document.input";
import { InventoryDocumentPdfData } from "../../domain/interfaces/inventory-document-data";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { ReferenceType } from "src/modules/inventory/domain/value-objects/reference-type";

const resolveLogoUrl = async (logoPath?: string) => {
  if (!logoPath) return undefined;
  if (/^(https?:|data:|file:)/i.test(logoPath)) return logoPath;

  const normalized = logoPath.replace(/\\/g, "/");
  let relative = normalized;

  if (normalized.startsWith("/api/assets/")) {
    relative = normalized.replace(/^\/api\/assets\//, "");
  } else if (normalized.startsWith("/assets/")) {
    relative = normalized.replace(/^\/assets\//, "");
  } else {
    relative = normalized.replace(/^\/+/, "");
  }

  const absolutePath = join(process.cwd(), "assets", relative);

  if (/\.webp$/i.test(absolutePath)) {
    try {
      const pngBuffer = await sharp(absolutePath).png().toBuffer();
      return `data:image/png;base64,${pngBuffer.toString("base64")}`;
    } catch {
      return pathToFileURL(absolutePath).toString();
    }
  }

  return pathToFileURL(absolutePath).toString();
};

const formatUnitLabel = (code?: string | null, name?: string | null) => {
  const label = [code, name].filter(Boolean).join(" - ");
  return label || "N/A";
};

const formatNameWithSku = (name: string, sku?: string | null) => (sku ? `${name} (${sku})` : name);

const DOC_TYPE_LABEL: Record<DocType, string> = {
  [DocType.IN]: "INGRESO DE INVENTARIO",
  [DocType.OUT]: "SALIDA DE INVENTARIO",
  [DocType.TRANSFER]: "TRANSFERENCIA DE INVENTARIO",
  [DocType.ADJUSTMENT]: "AJUSTE DE INVENTARIO",
  [DocType.PRODUCTION]: "PRODUCCION DE INVENTARIO",
};

const STATUS_LABEL: Record<DocStatus, string> = {
  [DocStatus.DRAFT]: "BORRADOR",
  [DocStatus.POSTED]: "POSTEADO",
  [DocStatus.CANCELLED]: "ANULADO",
};

const REFERENCE_LABEL: Record<ReferenceType, string> = {
  [ReferenceType.PURCHASE]: "COMPRA",
  [ReferenceType.PRODUCTION]: "PRODUCCION",
};

const resolveReference = (referenceType?: ReferenceType, referenceId?: string) => {
  if (!referenceType && !referenceId) return undefined;
  const label = referenceType ? REFERENCE_LABEL[referenceType] ?? referenceType : "";
  if (referenceId) return label ? `${label}: ${referenceId}` : referenceId;
  return label || undefined;
};

export class GenerateInventoryDocumentPdfUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GenerateInventoryDocumentPdfInput): Promise<Buffer> {
    const result = await this.documentRepo.getByIdWithItems(input.docId);
    if (!result) {
      throw new BadRequestException({ type: "error", message: "Documento de inventario no encontrado" });
    }

    const { doc, items } = result;

    const [serie, company, fromWarehouse, toWarehouse] = await Promise.all([
      this.seriesRepo.findById(doc.serieId),
      this.companyRepo.findSingle(),
      doc.fromWarehouseId ? this.warehouseRepo.findById(new WarehouseId(doc.fromWarehouseId)) : null,
      doc.toWarehouseId ? this.warehouseRepo.findById(new WarehouseId(doc.toWarehouseId)) : null,
    ]);

    if (!serie) {
      throw new BadRequestException({ type: "error", message: "Serie invalida" });
    }

    const stockItemCache = new Map<string, StockItem | null>();
    const productInfoCache = new Map<string, ProductWithUnitInfo | null>();
    const variantInfoCache = new Map<string, ProductVariantWithProductInfo | null>();

    const getStockItem = async (id: string) => {
      if (stockItemCache.has(id)) return stockItemCache.get(id);
      let row = await this.stockItemRepo.findById(id);
      if (!row) {
        row = await this.stockItemRepo.findByProductIdOrVariantId(id);
      }
      stockItemCache.set(id, row);
      return row;
    };

    const getProductInfo = async (id: string) => {
      if (productInfoCache.has(id)) return productInfoCache.get(id);
      const row = await this.productRepo.findByIdWithUnitInfo(ProductId.create(id));
      productInfoCache.set(id, row);
      return row;
    };

    const getVariantInfo = async (id: string) => {
      if (variantInfoCache.has(id)) return variantInfoCache.get(id);
      const row = await this.variantRepo.findByIdWithProductInfo(id);
      variantInfoCache.set(id, row);
      return row;
    };

    const mappedItems = await Promise.all(
      items.map(async (item) => {
        const stockItem = await getStockItem(item.stockItemId);
        let description = item.stockItemId;
        let unit = "N/A";

        if (stockItem?.type === StockItemType.PRODUCT && stockItem.productId) {
          const info = await getProductInfo(stockItem.productId);
          if (info?.product) {
            description = formatNameWithSku(info.product.getName(), info.product.getSku());
            unit = formatUnitLabel(info.baseUnitCode ?? null, info.baseUnitName ?? null);
          }
        }

        if (stockItem?.type === StockItemType.VARIANT && stockItem.variantId) {
          const info = await getVariantInfo(stockItem.variantId);
          if (info?.variant) {
            const baseName = info.productName || description;
            description = formatNameWithSku(baseName, info.variant.getSku());
            unit = formatUnitLabel(info.unitCode ?? null, info.unitName ?? null);
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

    const companyAddress =
      company?.address || [company?.department, company?.province, company?.district].filter(Boolean).join(" - ");

    const numberRaw = doc.correlative !== undefined ? String(doc.correlative) : undefined;
    const paddedNumber = numberRaw && serie.padding ? numberRaw.padStart(serie.padding, "0") : numberRaw;

    const data: InventoryDocumentPdfData = {
      company: {
        name: company?.name ?? "N/A",
        ruc: company?.ruc ?? undefined,
        address: companyAddress || undefined,
        logoUrl: await resolveLogoUrl(company?.logoPath ?? undefined),
      },
      document: {
        documentType: DOC_TYPE_LABEL[doc.docType] ?? doc.docType,
        serie: serie.code ?? undefined,
        number: paddedNumber ?? undefined,
        separator: serie.separator ?? undefined,
        issuedAt: doc.createdAt ?? undefined,
        postedAt: doc.postedAt ?? undefined,
        status: doc.status ? STATUS_LABEL[doc.status] ?? doc.status : undefined,
        reference: resolveReference(doc.referenceType ?? undefined, doc.referenceId ?? undefined),
        fromWarehouse: fromWarehouse?.name ?? undefined,
        toWarehouse: toWarehouse?.name ?? undefined,
      },
      items: mappedItems,
      totals: {
        totalCost,
      },
      note: doc.note ?? undefined,
    };

    return this.pdfRenderer.renderInventoryDocument(data);
  }
}


