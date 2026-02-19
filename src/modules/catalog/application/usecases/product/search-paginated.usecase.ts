import { Inject } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ListProductsInput } from "../../dto/products/input/list-products";
import { ProductOutput } from "../../dto/products/output/product-out";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export class SearchProductsPaginated {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: ListProductsInput): Promise<PaginatedResult<ProductOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.productRepo.searchPaginated({
      isActive: input.isActive,
      name: input.name,
      description: input.description,
      type: input.type,
      q: input.q,
      page,
      limit,
    });

    return {
      items: items.map((p) => ({
        id: p.getId()?.value,
        name: p.getName(),
        description: p.getDescription(),
        isActive: p.getIsActive(),
        type: p.getType(),
        createdAt: p.getCreatedAt(),
        updatedAt: p.getUpdatedAt(),
      })),
      total,
      page,
      limit,
    };
  }
}
