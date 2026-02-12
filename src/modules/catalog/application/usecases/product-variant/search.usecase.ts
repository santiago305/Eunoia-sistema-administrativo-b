import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ListProductVariantsInput } from "../../dto/product-variants/input/list-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { ProductId } from "src/modules/catalog/domain/value-object/product.vo";

export class SearchProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(
    input: ListProductVariantsInput,
  ): Promise<ProductVariantOutput[]> {

    const variants = await this.variantRepo.search({
      productId: input.productId
        ? new ProductId(input.productId)
        : undefined,
      sku: input.sku,
      barcode: input.barcode,
      isActive: input.isActive,
    });

    return variants.map(v => ({
      id: v.id,
      productId: v.productId.value,
      sku: v.sku,
      barcode: v.barcode,
      attributes: v.attributes,
      price: v.price.getAmount(),
      cost: v.cost.getAmount(),
      isActive: v.isActive,
      createdAt: v.createdAt,
    }));
  }
}

