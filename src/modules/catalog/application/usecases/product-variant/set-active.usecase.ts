import { Inject, NotFoundException } from '@nestjs/common';
import { SetProductVariantActiveInput } from '../../dto/product-variants/input/set-active-product-variant';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../ports/product-variant.repository';
import { ProductVariantNotFoundApplicationError } from '../../errors/product-variant-not-found.error';

export class SetProductVariantActive {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: SetProductVariantActiveInput) {
    const variant = await this.variantRepo.findById(input.id);
    if (!variant) {
      throw new NotFoundException(new ProductVariantNotFoundApplicationError().message);
    }

    await this.variantRepo.setActive(input.id, input.isActive);
    return { type: "success", message: "Operacion lograda con exito" };
  }
}
