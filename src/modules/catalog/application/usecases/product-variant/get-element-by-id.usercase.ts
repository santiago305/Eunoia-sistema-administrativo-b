import { Inject, NotFoundException } from '@nestjs/common';
import { GetProductVariantInput } from '../../dto/product-variants/input/get-by-id-product-variant';
import { ProductVariantOutput } from '../../dto/product-variants/output/product-variant-out';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../ports/product-variant.repository';
import { CatalogOutputMapper } from '../../mappers/catalog-output.mapper';
import { ProductVariantNotFoundApplicationError } from '../../errors/product-variant-not-found.error';

export class GetProductVariant {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: GetProductVariantInput): Promise<ProductVariantOutput> {
    const variant = await this.variantRepo.findById(input.id);
    if (!variant) {
      throw new NotFoundException(new ProductVariantNotFoundApplicationError().message);
    }

    return CatalogOutputMapper.toProductVariantOutput(variant);
  }
}
