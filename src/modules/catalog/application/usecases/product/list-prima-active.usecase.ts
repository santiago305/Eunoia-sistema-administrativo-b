import { Inject } from "@nestjs/common";
import { ProductOutput } from "../../dto/products/output/product-out";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";

export class ListPrimaActiveProducts {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(): Promise<ProductOutput[]> {
    const items = await this.productRepo.listPrimaActive();
    return items.map((product) => CatalogOutputMapper.toProductOutput(product));
  }
}
