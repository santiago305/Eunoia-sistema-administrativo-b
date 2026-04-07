import { Inject } from "@nestjs/common";
import { ListProductsInput } from "../../dto/products/input/list-products";
import { FlatProductOutput } from "../../dto/products/output/flat-product-out";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";

export interface PaginatedFlatResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export class SearchFlatProductsPaginated {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: ListProductsInput): Promise<PaginatedFlatResult<FlatProductOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.productRepo.searchFlatPaginated({
      isActive: input.isActive,
      name: input.name,
      description: input.description,
      sku: input.sku,
      barcode: input.barcode,
      type: input.type,
      q: input.q,
      page,
      limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
