import { Inject } from "@nestjs/common";
import { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { ListProductVariantsInput } from "../../dto/product-variants/input/list-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../ports/product-variant.repository";

export class ListProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: ListProductVariantsInput): Promise<ProductVariantOutput[]> {
    if (!input.productId) return [];

    const rows = await this.variantRepo.listByProductId(ProductId.create(input.productId));

    return rows.map((v: ProductVariant) => ({
      id: v.getId(),
      productId: v.getProductId().value,
      sku: v.getSku(),
      customSku: v.getCustomSku() ?? null,
      barcode: v.getBarcode(),
      attributes: v.getAttributes(),
      price: v.getPrice().getAmount(),
      cost: v.getCost().getAmount(),
      isActive: v.getIsActive(),
      createdAt: v.getCreatedAt(),
    }));
  }
}

