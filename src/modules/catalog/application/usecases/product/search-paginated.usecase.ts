import { Inject, NotFoundException } from "@nestjs/common";
import { ListProductsInput } from "../../dto/products/input/list-products";
import { ProductOutput } from "../../dto/products/output/product-out";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";

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
      sku: input.sku,
      barcode: input.barcode,
      type: input.type,
      q: input.q,
      page,
      limit,
    });

    return {
      items: items.map((row) => {
        const product = row.product;
        if (!row.baseUnitName || !row.baseUnitCode) {
          throw new NotFoundException(`Unidad no encontrada para el producto ${product.getId()?.value}`);
        }

        return {
          ...CatalogOutputMapper.toProductOutput(product),
          baseUnitName: row.baseUnitName,
          baseUnitCode: row.baseUnitCode,
        };
      }),
      total,
      page,
      limit,
    };
  }
}
