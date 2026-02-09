import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { GetProductVariantInput } from "../../dto/inputs";

export class GetProductVariant {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: GetProductVariantInput) {
    const variant = await this.variantRepo.findById(input.id);
    if (!variant) {
      throw new BadRequestException("Variant no encontrado");
    }
    return variant;
  }
}
