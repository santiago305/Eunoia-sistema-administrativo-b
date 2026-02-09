import { Inject } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";
import { ListProductsInput } from "../../dto/inputs";
import { ProductOutput } from "../../dto/outputs";

export class SearchProducts {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: ListProductsInput): Promise<ProductOutput[]> {
    const rows = await this.productRepo.search(
      { name: input.name, description: input.description },
    );

    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }
}
