import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";

export class ListRowMaterialProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(): Promise<ProductVariantOutput[]> {
    const rows = await this.variantRepo.listRowMaterial();
    return rows.map((row) => {
      const v: ProductVariant = row.variant;
      return {
        id: v.getId(),
        productId: v.getProductId().value,
        productName: row.productName,
        productDescription: row.productDescription,
        baseUnitId: row.baseUnitId,
        unitCode: row.unitCode,
        unitName: row.unitName,
        sku: v.getSku(),
        barcode: v.getBarcode(),
        attributes: v.getAttributes(),
        price: v.getPrice().getAmount(),
        cost: v.getCost().getAmount(),
        isActive: v.getIsActive(),
        createdAt: v.getCreatedAt(),
      };
    });
  }
}
