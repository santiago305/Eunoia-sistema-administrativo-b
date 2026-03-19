import type { ProductOutput } from "src/modules/catalog/application/dto/products/output/product-out";
import type { ProductVariantOutput } from "src/modules/catalog/application/dto/product-variants/output/product-variant-out";
import type { Product } from "src/modules/catalog/domain/entity/product";
import type { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";

export function toProductOutput(
  product: Product,
  info?: { baseUnitName?: string; baseUnitCode?: string },
): ProductOutput {
  return {
    id: product.getId()?.value!,
    name: product.getName(),
    description: product.getDescription(),
    baseUnitId: product.getBaseUnitId(),
    sku: product.getSku(),
    barcode: product.getBarcode(),
    price: product.getPrice().getAmount(),
    cost: product.getCost().getAmount(),
    attributes: product.getAttributes(),
    isActive: product.getIsActive(),
    type: product.getType(),
    createdAt: product.getCreatedAt()!,
    updatedAt: product.getUpdatedAt()!,
    baseUnitName: info?.baseUnitName,
    baseUnitCode: info?.baseUnitCode,
  };
}

export function toVariantOutput(
  variant: ProductVariant,
  info?: {
    productName?: string;
    productDescription?: string | null;
    baseUnitId?: string;
    unitCode?: string;
    unitName?: string;
  },
): ProductVariantOutput {
  return {
    id: variant.getId(),
    productId: variant.getProductId().value,
    productName: info?.productName,
    productDescription: info?.productDescription ?? null,
    baseUnitId: info?.baseUnitId,
    unitCode: info?.unitCode,
    unitName: info?.unitName,
    sku: variant.getSku(),
    barcode: variant.getBarcode(),
    attributes: variant.getAttributes(),
    price: variant.getPrice().getAmount(),
    cost: variant.getCost().getAmount(),
    isActive: variant.getIsActive(),
    createdAt: variant.getCreatedAt(),
  };
}
