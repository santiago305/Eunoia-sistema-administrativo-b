import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { SetProductVariantActiveInput } from "../../dto/inputs";

export class SetProductVariantActive {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: SetProductVariantActiveInput) {
    await this.variantRepo.setActive(input.id, input.isActive);
    return { ok: true };
  }
}
