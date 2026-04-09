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
import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { StockItem } from "src/modules/product-catalog/compat/entities/stock-item";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/product-catalog/compat/ports/stock-item.repository.port";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PdfGeneratedValidationError } from "../errors/pdf-generated-validation.error";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";

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

type StockItemSnapshot = {
  id: string;
  type: StockItemType | "SKU";
  productId: string | null;
  product: { id: string; name: string | null; sku: string | null; unidad: string | null } | null;
  sku: {
    id: string;
    productId: string;
    productName: string;
    name: string;
    sku: string | null;
    unidad: string | null;
    attributes: Record<string, unknown> | null;
  } | null;
};

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
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
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
      throw new BadRequestException(new PdfGeneratedValidationError("CompaÃ±Ã­a invÃ¡lida").message);
    }
    if (!supplier) {
      throw new BadRequestException(new PdfGeneratedValidationError("Proveedor invÃ¡lido").message);
    }
    if (!items) {
      throw new BadRequestException(new PdfGeneratedValidationError("Items de compra invÃ¡lidos").message);
    }

    const stockItemCache = new Map<string, StockItem | null>();
    const skuStockItemCache = new Map<string, Awaited<ReturnType<ProductCatalogStockItemRepository["findById"]>>>();

    const getStockItem = async (id: string) => {
      if (stockItemCache.has(id)) return stockItemCache.get(id);
      let row = await this.stockItemRepo.findById(id);
      if (!row) {
        row = await this.stockItemRepo.findByProductOrStockItemId(id);
      }
      stockItemCache.set(id, row);
      return row;
    };

    const getSkuStockItem = async (id: string) => {
      if (skuStockItemCache.has(id)) return skuStockItemCache.get(id);
      const row = await this.productCatalogStockItemRepo.findById(id);
      skuStockItemCache.set(id, row);
      return row;
    };

    const buildStockItemSnapshot = async (stockItemId: string, unitBase?: string): Promise<StockItemSnapshot | undefined> => {
      const stockItem = await getStockItem(stockItemId);
      if (!stockItem) {
        const skuStockItem = await getSkuStockItem(stockItemId);
        if (!skuStockItem) return undefined;
        const sku = await this.productCatalogSkuRepo.findById(skuStockItem.skuId);
        if (!sku) return undefined;
        const product = await this.productCatalogProductRepo.findById(sku.sku.productId);
        return {
          id: skuStockItem.id!,
          type: "SKU",
          productId: sku.sku.productId,
          product: null,
          sku: {
            id: sku.sku.id!,
            productId: sku.sku.productId,
            productName: product?.name ?? sku.sku.name,
            name: sku.sku.name,
            sku: sku.sku.backendSku ?? sku.sku.customSku ?? null,
            unidad: unitBase ?? null,
            attributes: Object.fromEntries(sku.attributes.map((attribute) => [attribute.code, attribute.value])),
          },
        };
      }

      if (stockItem.type === StockItemType.PRODUCT && stockItem.productId) {
        return {
          id: stockItem.stockItemId ?? stockItemId,
          type: stockItem.type,
          productId: stockItem.productId ?? null,
          product: {
            id: stockItem.productId,
            name: null,
            sku: null,
            unidad: unitBase ?? null,
          },
          sku: null,
        };
      }

      return {
        id: stockItem.stockItemId ?? stockItemId,
        type: stockItem.type,
        productId: stockItem.productId ?? null,
        product: null,
        sku: null,
      };
    };

    const buildDescription = (snapshot: StockItemSnapshot | undefined, fallback: string) => {
      if (!snapshot) return fallback;

      const baseName =
        snapshot.sku?.name ??
        snapshot.product?.name ??
        (snapshot.productId ? `PRODUCT ${snapshot.productId}` : fallback);
      const baseSku = snapshot.sku?.sku ?? snapshot.product?.sku ?? null;
      return baseSku ? `${baseName} (${baseSku})` : baseName;
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
        const snapshot = await buildStockItemSnapshot(item.stockItemId, item.unitBase ?? undefined);
        return {
          description: buildDescription(snapshot, item.stockItemId),
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



