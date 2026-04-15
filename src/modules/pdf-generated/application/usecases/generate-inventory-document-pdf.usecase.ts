import { BadRequestException, Inject } from "@nestjs/common";
import { join } from "path";
import { pathToFileURL } from "url";
import sharp from "sharp";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PDF_RENDERER, PdfRendererPort } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";
import { GenerateInventoryDocumentPdfInput } from "../dtos/inventory-document/input/generate-inventory-document.input";
import { InventoryDocumentPdfData } from "../../domain/interfaces/inventory-document-data";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/application/ports/warehouse.repository.port";
import { PdfGeneratedValidationError } from "../errors/pdf-generated-validation.error";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY, ProductCatalogDocumentSerieRepository } from "src/modules/product-catalog/domain/ports/document-serie.repository";
import { PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY, ProductCatalogInventoryDocumentRepository } from "src/modules/product-catalog/domain/ports/inventory-document.repository";
import { ProductCatalogStockItem } from "src/modules/product-catalog/domain/entities/stock-item";
import { ProductCatalogSkuWithAttributes } from "src/modules/product-catalog/domain/ports/sku.repository";
import { ProductCatalogProduct } from "src/modules/product-catalog/domain/entities/product";

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
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly seriesRepo: ProductCatalogDocumentSerieRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly productCatalogStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly productCatalogSkuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productCatalogProductRepo: ProductCatalogProductRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GenerateInventoryDocumentPdfInput): Promise<Buffer> {
    const [doc, items] = await Promise.all([
      this.documentRepo.findById(input.docId),
      this.documentRepo.listItems(input.docId),
    ]);

    if (!doc) {
      throw new BadRequestException(new PdfGeneratedValidationError("Documento de inventario no encontrado").message);
    }

    const serieId = doc.serieId ?? undefined;
    const fromWarehouseId = doc.fromWarehouseId ?? undefined;
    const toWarehouseId = doc.toWarehouseId ?? undefined;

    const [serie, company, fromWarehouse, toWarehouse] = await Promise.all([
      serieId ? this.seriesRepo.findById(serieId) : Promise.resolve(null),
      this.companyRepo.findSingle(),
      fromWarehouseId ? this.warehouseRepo.findById(new WarehouseId(fromWarehouseId)) : null,
      toWarehouseId ? this.warehouseRepo.findById(new WarehouseId(toWarehouseId)) : null,
    ]);

    if (serieId && !serie) {
      throw new BadRequestException(new PdfGeneratedValidationError("Serie inválida").message);
    }
    if (!company) {
      throw new BadRequestException(new PdfGeneratedValidationError("Compañía inválida").message);
    }
    if (fromWarehouseId && !fromWarehouse) {
      throw new BadRequestException(new PdfGeneratedValidationError("Almacén de origen inválido").message);
    }
    if (toWarehouseId && !toWarehouse) {
      throw new BadRequestException(new PdfGeneratedValidationError("Almacén de destino inválido").message);
    }

    if (!fromWarehouseId && !toWarehouseId) {
      throw new BadRequestException(new PdfGeneratedValidationError("Documento de inventario sin almacén asociado").message);
    }

    if (doc.docType === DocType.TRANSFER) {
      if (!fromWarehouseId) {
        throw new BadRequestException(new PdfGeneratedValidationError("Almacén de origen requerido para transferencia").message);
      }
      if (!toWarehouseId) {
        throw new BadRequestException(new PdfGeneratedValidationError("Almacén de destino requerido para transferencia").message);
      }
    }

    const stockItemCache = new Map<string, ProductCatalogStockItem | null>();
    const getStockItem = async (id: string): Promise<ProductCatalogStockItem | null> => {
      if (stockItemCache.has(id)) return stockItemCache.get(id);
      const row = await this.productCatalogStockItemRepo.findById(id);
      stockItemCache.set(id, row);
      return row;
    };

    const skuCache = new Map<string, ProductCatalogSkuWithAttributes | null>();
    const getSku = async (id: string): Promise<ProductCatalogSkuWithAttributes | null> => {
      if (skuCache.has(id)) return skuCache.get(id);
      const row = await this.productCatalogSkuRepo.findById(id);
      skuCache.set(id, row);
      return row;
    };

    const productCache = new Map<string, ProductCatalogProduct | null>();
    const getProduct = async (id: string): Promise<ProductCatalogProduct | null> => {
      if (productCache.has(id)) return productCache.get(id);
      const row = await this.productCatalogProductRepo.findById(id);
      productCache.set(id, row);
      return row;
    };

    const mappedItems = await Promise.all(
      items.map(async (item) => {
        const stockItem = await getStockItem(item.stockItemId);
        let description = item.stockItemId;
        let unit = "N/A";

        const skuId = stockItem?.skuId;
        if (skuId) {
          const sku = await getSku(skuId);
          const product = sku ? await getProduct(sku.sku.productId) : null;
          if (sku) {
            const skuCode = sku.sku.backendSku || sku.sku.customSku || null;
            description = formatNameWithSku(`${product?.name ?? sku.sku.name} - ${sku.sku.name}`, skuCode);
            unit = sku.unit ? formatUnitLabel(sku.unit.code, sku.unit.name) : "SKU";
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

    const numberRaw = doc.correlative !== null && doc.correlative !== undefined ? String(doc.correlative) : undefined;
    const paddedNumber = numberRaw && serie?.padding ? numberRaw.padStart(serie.padding, "0") : numberRaw;

    const data: InventoryDocumentPdfData = {
      company: {
        name: company?.name ?? "N/A",
        ruc: company?.ruc ?? undefined,
        address: companyAddress || undefined,
        logoUrl: await resolveLogoUrl(company?.logoPath ?? undefined),
      },
      document: {
        documentType: DOC_TYPE_LABEL[doc.docType] ?? doc.docType,
        serie: serie?.code ?? undefined,
        number: paddedNumber ?? undefined,
        separator: serie?.separator ?? undefined,
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






