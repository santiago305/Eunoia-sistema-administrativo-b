import { ProductVariantOutput } from "../dto/product-variants/output/product-variant-out";
import { ProductOutput } from "../dto/products/output/product-out";
import { Product } from "../../domain/entity/product";
import { ProductVariant } from "../../domain/entity/product-variant";

export class CatalogOutputMapper {
  static toProductOutput(product: Product): ProductOutput {
    return {
      id: product.getId()?.value ?? "",
      baseUnitId: product.getBaseUnitId(),
      name: product.getName(),
      description: product.getDescription(),
      sku: product.getSku(),
      customSku: product.getCustomSku() ?? null,
      barcode: product.getBarcode(),
      price: product.getPrice().getAmount(),
      cost: product.getCost().getAmount(),
      minStock: product.getMinStock(),
      attributes: product.getAttributes(),
      isActive: product.getIsActive(),
      type: product.getType(),
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };
  }

  static toProductVariantOutput(variant: ProductVariant): ProductVariantOutput {
    return {
      id: variant.getId(),
      productId: variant.getProductId().value,
      sku: variant.getSku(),
      customSku: variant.getCustomSku() ?? null,
      barcode: variant.getBarcode(),
      attributes: variant.getAttributes(),
      price: variant.getPrice().getAmount(),
      cost: variant.getCost().getAmount(),
      minStock: variant.getMinStock(),
      isActive: variant.getIsActive(),
      createdAt: variant.getCreatedAt(),
    };
  }
}
