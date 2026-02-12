import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { ListProductVariantsInput } from "../../dto/product-variants/input/list-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { ProductId } from "src/modules/catalag/domain/value-object/product.vo";
import { PaginatedResult } from "../../dto/product-variants/output/paginated-result";

export class SearchProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(
    input: ListProductVariantsInput,
  ): Promise<PaginatedResult<ProductVariantOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;


    const { items, total } = await this.variantRepo.search({
      productId: input.productId ? new ProductId(input.productId) : undefined,
      sku: input.sku,
      barcode: input.barcode,
      q: input.q,
      isActive: input.isActive,
      productName: input.productName,
      productDescription: input.productDescription,
      page,
      limit,
    });

    return {
      items: items.map((x) => ({
        id: x.variant.id,
        productId: x.variant.productId.value,
        sku: x.variant.sku,
        barcode: x.variant.barcode,
        attributes: x.variant.attributes,
        price: x.variant.price.getAmount(),
        cost: x.variant.cost.getAmount(),
        isActive: x.variant.isActive,
        createdAt: x.variant.createdAt,
        productName: x.productName,
        productDescription: x.productDescription,
      })),
      total,
      page,
      limit,
    };
  }
}