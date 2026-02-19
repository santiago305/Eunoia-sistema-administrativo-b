import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";
import { ListProductVariantsInput } from "../../dto/product-variants/input/list-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";

export class ListInactiveProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: ListProductVariantsInput = {}): Promise<ProductVariantOutput[]> {
    if (!input.productId) return [];
    const rows = await this.variantRepo.listInactiveByProductId(ProductId.create(input.productId));

    return rows.map((v: ProductVariant) => ({
      id: v.getId(),
      productId: v.getProductId().value,
      baseUnitId: v.getBaseUnitId(),
      sku: v.getSku(),
      barcode: v.getBarcode(),
      attributes: v.getAttributes(),
      price: v.getPrice().getAmount(),
      cost: v.getCost().getAmount(),
      isActive: v.getIsActive(),
      createdAt: v.getCreatedAt(),
    }));
  }
}
