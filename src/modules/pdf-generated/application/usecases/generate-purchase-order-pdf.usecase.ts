import { BadRequestException, Inject } from "@nestjs/common";
import { join } from "path";
import { pathToFileURL } from "url";
import sharp from "sharp";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PDF_RENDERER, PdfRendererPort } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";
import { GeneratePurchaseOrderPdfInput } from "../dtos/purchase-order/input/generate-purchase-order.input";
import { PurchaseOrderPdfData } from "../../domain/interfaces/purchase-data";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PdfGeneratedValidationError } from "../errors/pdf-generated-validation.error";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository, SkuAttributeInput } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
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

const formatNameWithSku = (name: string, sku?: string | null) => (sku ? `${name} (${sku})` : name);

export class GeneratePurchaseOrderPdfUseCase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly productCatalogStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly productCatalogSkuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productCatalogProductRepo: ProductCatalogProductRepository,
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GeneratePurchaseOrderPdfInput): Promise<Buffer> {
    const order = await this.purchaseRepo.findById(input.poId);
    if (!order) {
      throw new BadRequestException(new PdfGeneratedValidationError("Orden de compra no encontrada").message);
    }

    const [items, supplier, company] = await Promise.all([
      this.itemRepo.getByPurchaseId(order.poId, order.currency ?? CurrencyType.PEN),
      this.supplierRepo.findById(order.supplierId),
      this.companyRepo.findSingle(),
    ]);

    if (!company) {
      throw new BadRequestException(new PdfGeneratedValidationError("Compañía inválida").message);
    }
    if (!supplier) {
      throw new BadRequestException(new PdfGeneratedValidationError("Proveedor inválido").message);
    }
    if (!items) {
      throw new BadRequestException(new PdfGeneratedValidationError("Items de compra inválidos").message);
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
    const formatSkuAttrs = (attrs?: SkuAttributeInput[]) =>
      (attrs ?? [])
        .map((attr) => (attr.value ?? "").trim())
        .filter(Boolean)
        .join(" ");

    const buildPurchaseSkuLabel = (sku: ProductCatalogSkuWithAttributes) => {
      const attrsText = formatSkuAttrs(sku.attributes);
      const skuPart = sku.sku.backendSku ? ` - ${sku.sku.backendSku}` : "";
      const customPart = sku.sku.customSku ? ` (${sku.sku.customSku})` : "";
      const attrsPart = attrsText ? ` ${attrsText}` : "";
      return `${sku.sku.name}${attrsPart}${skuPart}${customPart}`.trim();
    };

    const supplierName =
      supplier?.tradeName ||
      [supplier?.name, supplier?.lastName].filter(Boolean).join(" ") ||
      "N/A";

    let supplierTypeDoc = "DOC";
    if (supplier.documentType === SupplierDocType.RUC) supplierTypeDoc = "RUC";
    if (supplier.documentType === SupplierDocType.DNI) supplierTypeDoc = "DNI";
    if (supplier.documentType === SupplierDocType.CE) supplierTypeDoc = "CE";

    const companyAddress = company?.address || [
      company?.department,
      company?.province,
      company?.district,
    ].filter(Boolean).join(" - ");

    const totalTaxed = order.totalTaxed.getAmount();
    const totalExempted = order.totalExempted.getAmount();
    const totalIgv = order.totalIgv.getAmount();
    const total = order.total.getAmount();

    const igvPercentage = totalTaxed > 0 ? Number(((totalIgv / totalTaxed) * 100).toFixed(2)) : 0;

    const mappedItems = await Promise.all(
      items.map(async (item) => {
        const stockItem = await getStockItem(item.stockItemId);
        let description = item.stockItemId;

        const skuId = stockItem?.skuId;
        if (skuId) {
          const sku = await getSku(skuId);
          if (sku) {
            description = buildPurchaseSkuLabel(sku); 
          }
        }
        return {
          description,
          unit: `${item.equivalence}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice.getAmount(),
          total: item.purchaseValue.getAmount(),
        };
      }),
    );

    const data: PurchaseOrderPdfData = {
      company: {
        name: company?.name ?? "N/A",
        ruc: company?.ruc ?? undefined,
        address: companyAddress || undefined,
        logoUrl: await resolveLogoUrl(company?.logoPath ?? undefined),
      },
      supplier: {
        name: supplierName,
        documentType: supplierTypeDoc,
        document: supplier.documentNumber,
        address: supplier?.address ?? undefined,
      },
      order: {
        documentType: order.documentType ?? "ORDEN DE COMPRA",
        serie: order.serie ?? undefined,
        number: order.correlative !== undefined ? String(order.correlative) : undefined,
        issuedAt: order.dateIssue ?? order.createdAt,
        expectedAt: order.expectedAt ?? undefined,
        currency: order.currency ?? undefined,
        paymentForm: order.paymentForm ?? undefined,
        creditDays: order.creditDays ?? undefined,
        status: order.status ?? undefined,
      },
      items: mappedItems,
      totals: {
        taxed: totalTaxed,
        exempted: totalExempted,
        igv: totalIgv,
        total,
        igvPercentage,
      },
      note: order.note ?? undefined,
    };

    return this.pdfRenderer.renderPurchaseOrder(data);
  }
}