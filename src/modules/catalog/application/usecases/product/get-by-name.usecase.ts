import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { GetProductByNameInput } from "../../dto/products/input/get-product-by-name";
import { ProductOutput } from "../../dto/products/output/product-out";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";
import { ProductNotFoundApplicationError } from "../../errors/product-not-found.error";

export class GetProductByName {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByNameInput): Promise<ProductOutput> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("El nombre es obligatorio");
    }

    const product = await this.productRepo.findByName(name);
    if (!product) {
      throw new NotFoundException(new ProductNotFoundApplicationError().message);
    }

    return CatalogOutputMapper.toProductOutput(product);
  }
}
