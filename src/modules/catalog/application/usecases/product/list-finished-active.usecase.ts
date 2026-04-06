import { Inject } from "@nestjs/common";
import { ProductOutput } from "../../dto/products/output/product-out";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";

export class ListFinishedActiveProducts {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(): Promise<ProductOutput[]> {
    const items = await this.productRepo.listFinishedActive();
    return items.map((product) => CatalogOutputMapper.toProductOutput(product));
  }
}
