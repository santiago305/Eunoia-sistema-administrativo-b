import { Inject, NotFoundException } from "@nestjs/common";
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
      sku: input.sku,
      barcode: input.barcode,
      type: input.type,
      q: input.q,
      page,
      limit,
    });

    return {
      items: items.map((row) => {
        const p = row.product;
        if (!row.baseUnitName || !row.baseUnitCode) {
          throw new NotFoundException({
            type: 'error',
            message: `Unit not found for product ${p.getId()?.value}`,
          });
        }
        return {
          id: p.getId()?.value,
          baseUnitId: p.getBaseUnitId(),
          name: p.getName(),
          sku: p.getSku(),
          barcode: p.getBarcode(),
          cost: p.getCost().getAmount(),
          price: p.getPrice().getAmount(),
          attributes: p.getAttributes(),
          description: p.getDescription(),
          baseUnitName: row.baseUnitName,
          baseUnitCode: row.baseUnitCode,
          isActive: p.getIsActive(),
          type: p.getType(),
          createdAt: p.getCreatedAt(),
          updatedAt: p.getUpdatedAt(),
        };
      }),
      total,
      page,
      limit,
    };
  }
}
