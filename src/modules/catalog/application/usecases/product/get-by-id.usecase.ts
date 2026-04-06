import { Inject, NotFoundException } from "@nestjs/common";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { GetProductByIdInput } from "../../dto/products/input/get-product-by-id";
import { ProductOutput } from "../../dto/products/output/product-out";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";
import { ProductNotFoundApplicationError } from "../../errors/product-not-found.error";

export class GetProductById {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByIdInput): Promise<ProductOutput> {
    const product = await this.productRepo.findById(ProductId.create(input.id));
    if (!product) {
      throw new NotFoundException(new ProductNotFoundApplicationError().message);
    }

    return CatalogOutputMapper.toProductOutput(product);
  }
}
