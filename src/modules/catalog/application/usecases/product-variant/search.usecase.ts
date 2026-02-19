import { Inject } from '@nestjs/common';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { ListProductVariantsInput } from '../../dto/product-variants/input/list-product-variant';
import { ProductVariantOutput } from '../../dto/product-variants/output/product-variant-out';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { PaginatedResult } from '../../dto/product-variants/output/paginated-result';
import { UNIT_REPOSITORY, UnitRepository } from 'src/modules/catalog/domain/ports/unit.repository';
export class SearchProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepo: UnitRepository
  ) {}

  async execute(input: ListProductVariantsInput): Promise<PaginatedResult<ProductVariantOutput>> {
    
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.variantRepo.search({
      productId: input.productId? ProductId.create(input.productId) : undefined,
      sku: input.sku,
      barcode: input.barcode,
      q: input.q,
      isActive: input.isActive,
      productName: input.productName,
      productDescription: input.productDescription,
      type:input.type,
      page,
      limit,
    });
    
    const itemsWithUnit = await Promise.all(
      items.map(async (x) => {
        const unit = await this.unitRepo.getById(x.variant.getBaseUnitId());
        return {
          id: x.variant.getId(),
          productId: x.variant.getProductId().value,
          baseUnitId: x.variant.getBaseUnitId(),
          unitName: unit.name,
          unitCode: unit.code,
          productName: x.productName,
          sku: x.variant.getSku(),
          barcode: x.variant.getBarcode(),
          attributes: x.variant.getAttributes(),
          price: x.variant.getPrice().getAmount(),
          cost: x.variant.getCost().getAmount(),
          isActive: x.variant.getIsActive(),
          createdAt: x.variant.getCreatedAt(),
          // productDescription: x.productDescription,
        };
      }),
    );

    return { items: itemsWithUnit, total, page, limit };
  }
}
