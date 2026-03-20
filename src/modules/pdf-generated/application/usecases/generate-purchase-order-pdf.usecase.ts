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
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { StockItem } from "src/modules/inventory/domain/entities/stock-item/stock-item";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { UnitRepository, UNIT_REPOSITORY } from "src/modules/catalog/domain/ports/unit.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { Product } from "src/modules/catalog/domain/entity/product";
import { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";
import { Unit } from "src/modules/catalog/domain/entity/unit";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

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

const formatAttributes = (attrs: Record<string, unknown> | null | undefined) => {
  if (!attrs) return "";
  const entries = Object.entries(attrs).filter(([key, value]) => key && value !== undefined && value !== null);
  if (entries.length === 0) return "";
  return entries.map(([key, value]) => `${key}:${String(value)}`).join(", ");
};

type StockItemSnapshot = {
  id: string;
  type: StockItemType;
  productId: string | null;
  variantId: string | null;
  product: { id: string; name: string; sku: string | null; unidad: string | null } | null;
  variant: {
    id: string;
    productId: string;
    name: string | null;
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
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepo: UnitRepository,
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GeneratePurchaseOrderPdfInput): Promise<Buffer> {
    const order = await this.purchaseRepo.findById(input.poId);
    if (!order) {
      throw new BadRequestException({ type: "error", message: "Orden de compra no encontrada" });
    }

    const [items, supplier, company, units] = await Promise.all([
      this.itemRepo.getByPurchaseId(order.poId),
      this.supplierRepo.findById(order.supplierId),
      this.companyRepo.findSingle(),
      this.unitRepo.list(),
    ]);

    const unitById = new Map(units.map((u) => [u.unitId, u]));
    const unitByCode = new Map(units.map((u) => [u.code, u]));

    const stockItemCache = new Map<string, StockItem | null>();
    const productCache = new Map<string, Product | null>();
    const variantCache = new Map<string, ProductVariant | null>();

    const getStockItem = async (id: string) => {
      if (stockItemCache.has(id)) return stockItemCache.get(id);
      let row = await this.stockItemRepo.findById(id);
      if (!row) {
        row = await this.stockItemRepo.findByProductIdOrVariantId(id);
      }
      stockItemCache.set(id, row);
      return row;
    };

    const getProduct = async (id: string) => {
      if (productCache.has(id)) return productCache.get(id);
      try {
        const row = await this.productRepo.findById(ProductId.create(id));
        productCache.set(id, row);
        return row;
      } catch {
        productCache.set(id, null);
        return null;
      }
    };

    const getVariant = async (id: string) => {
      if (variantCache.has(id)) return variantCache.get(id);
      const row = await this.variantRepo.findById(id);
      variantCache.set(id, row);
      return row;
    };

    const resolveUnitName = (unitBase?: string, baseUnitId?: string) => {
      if (unitBase) {
        const fromCode = unitByCode.get(unitBase as string);
        if (fromCode) return fromCode.name;
      }
      if (baseUnitId) {
        const fromId = unitById.get(baseUnitId);
        if (fromId) return fromId.name;
      }
      return null;
    };

    const buildStockItemSnapshot = async (stockItemId: string, unitBase?: string): Promise<StockItemSnapshot | undefined> => {
      const stockItem = await getStockItem(stockItemId);
      if (!stockItem) return undefined;

      if (stockItem.type === StockItemType.PRODUCT && stockItem.productId) {
        const product = await getProduct(stockItem.productId);
        const unitName = product ? resolveUnitName(unitBase, product.getBaseUnitId()) : null;
        return {
          id: stockItem.stockItemId ?? stockItemId,
          type: stockItem.type,
          productId: stockItem.productId ?? null,
          variantId: null,
          product: product
            ? {
                id: product.getId()?.value ?? stockItem.productId,
                name: product.getName(),
                sku: product.getSku() ?? null,
                unidad: unitName,
              }
            : null,
          variant: null,
        };
      }

      if (stockItem.type === StockItemType.VARIANT && stockItem.variantId) {
        const variant = await getVariant(stockItem.variantId);
        const productFromVariant = variant ? await getProduct(variant.getProductId().value) : null;
        const unitName = productFromVariant ? resolveUnitName(unitBase, productFromVariant.getBaseUnitId()) : null;
        return {
          id: stockItem.stockItemId ?? stockItemId,
          type: stockItem.type,
          productId: stockItem.productId ?? null,
          variantId: stockItem.variantId ?? null,
          product: productFromVariant
            ? {
                id: productFromVariant.getId()?.value ?? variant?.getProductId().value ?? "",
                name: productFromVariant.getName(),
                sku: productFromVariant.getSku() ?? null,
                unidad: unitName,
              }
            : null,
          variant: variant
            ? {
                id: variant.getId(),
                productId: variant.getProductId().value,
                name: productFromVariant?.getName() ?? null,
                sku: variant.getSku() ?? null,
                unidad: unitName,
                attributes: (variant.getAttributes() as Record<string, unknown>) ?? null,
              }
            : null,
        };
      }

      return {
        id: stockItem.stockItemId ?? stockItemId,
        type: stockItem.type,
        productId: stockItem.productId ?? null,
        variantId: stockItem.variantId ?? null,
        product: null,
        variant: null,
      };
    };

    const buildDescription = (snapshot: StockItemSnapshot | undefined, fallback: string) => {
      if (!snapshot) return fallback;

      const baseName = snapshot.variant?.name ?? snapshot.product?.name ?? fallback;
      const attrs = snapshot.variant?.attributes ?? null;
      const attrsSku = (() => {
        if (!attrs) return null;
        const entries = Object.entries(attrs);
        const preferredKeys = new Set(["sku", "variant", "variante", "codigo", "code"]);
        for (const [key, value] of entries) {
          if (!key) continue;
          const normalized = key.toLowerCase();
          if (preferredKeys.has(normalized) && value !== null && value !== undefined) {
            return String(value);
          }
        }
        return null;
      })();

      const baseSku = snapshot.variant?.sku ?? snapshot.product?.sku ?? attrsSku ?? null;
      const baseLabel = baseSku ? `${baseName} (${baseSku})` : baseName;

      return baseLabel || fallback;
    };

    const supplierName =
      supplier?.tradeName ||
      [supplier?.name, supplier?.lastName].filter(Boolean).join(" ") ||
      "N/A";

      let supplierTypeDoc:string
      if(supplier.documentType === SupplierDocType.RUC){
        supplierTypeDoc = 'RUC'
      }
      if(supplier.documentType === SupplierDocType.DNI){
        supplierTypeDoc = 'DNI'
      }
      if(supplier.documentType === SupplierDocType.CE){
        supplierTypeDoc = 'CE'
      }
      

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


