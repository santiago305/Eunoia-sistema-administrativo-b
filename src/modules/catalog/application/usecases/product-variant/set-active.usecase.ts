import { Inject, NotFoundException } from '@nestjs/common';
import { SetProductVariantActiveInput } from '../../dto/product-variants/input/set-active-product-variant';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../ports/product-variant.repository';

export class SetProductVariantActive {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: SetProductVariantActiveInput) {
    const variant = await this.variantRepo.findById(input.id);
    if (!variant) throw new NotFoundException({type: 'error', message: 'Variant no encontrado'});

    await this.variantRepo.setActive(input.id, input.isActive);
    return { ok: true };
  }
}

