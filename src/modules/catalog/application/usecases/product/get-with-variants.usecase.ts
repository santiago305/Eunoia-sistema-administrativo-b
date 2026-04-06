import { Inject, NotFoundException } from "@nestjs/common";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { GetProductByIdInput } from "../../dto/products/input/get-product-by-id";
import { ProductDetailOutput } from "../../dto/products/output/product-with-variants";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";
import { ProductNotFoundApplicationError } from "../../errors/product-not-found.error";

export class GetProductWithVariants {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByIdInput): Promise<ProductDetailOutput> {
    const result = await this.productRepo.getByIdWithVariants(ProductId.create(input.id));
    if (!result) {
      throw new NotFoundException(new ProductNotFoundApplicationError().message);
    }

    return {
      product: CatalogOutputMapper.toProductOutput(result.product),
      variants: result.items.map((variant) => CatalogOutputMapper.toProductVariantOutput(variant)),
    };
  }
}
