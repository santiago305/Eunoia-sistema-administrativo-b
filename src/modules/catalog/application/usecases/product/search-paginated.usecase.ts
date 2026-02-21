import { Inject, NotFoundException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ListProductsInput } from "../../dto/products/input/list-products";
import { ProductOutput } from "../../dto/products/output/product-out";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { UNIT_REPOSITORY, UnitRepository } from "src/modules/catalog/domain/ports/unit.repository";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export class SearchProductsPaginated {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepo: UnitRepository
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
      items: await Promise.all(
        items.map(async (p) => {
          const variantDefault = await this.variantRepo.findById(p.getVariantDefaultId());
          const unit = await this.unitRepo.getById(p.getBaseUnitId());
          if(!variantDefault) {
            throw new NotFoundException({
              type: 'error',
              message: `Variant default not found for product ${p.getId()?.value}`,
            });
          }
          if(!unit) {
            throw new NotFoundException({
              type: 'error',
              message: `Unit not found for product ${p.getId()?.value}`,
            });
          }
          return {
            id: p.getId()?.value,
            baseUnitId: p.getBaseUnitId(),
            primaDefaultVariantId: p.getVariantDefaultId(), 
            name: p.getName(),
            sku: variantDefault?.getSku(),
            cost: variantDefault?.getCost()?.getAmount(),
            price: variantDefault?.getPrice()?.getAmount(),
            attributes: variantDefault?.getAttributes(),
            description: p.getDescription(),
            baseUnitName: unit.name,
            baseUnitCode: unit.code,
            isActive: p.getIsActive(),
            type: p.getType(),
            createdAt: p.getCreatedAt(),
            updatedAt: p.getUpdatedAt(),
          };
        }),
      ),
      total,
      page,
      limit,
    };
  }
}
