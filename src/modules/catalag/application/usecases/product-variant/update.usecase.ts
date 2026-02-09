import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { UpdateProductVariantInput } from "../../dto/inputs";
import { Money } from "src/modules/catalag/domain/value-object/money.vo";

export class UpdateProductVariant {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: UpdateProductVariantInput) {
    const updated = await this.variantRepo.update({
      id: input.id,
      sku: input.sku,
      barcode: input.barcode,
      attributes: input.attributes,
      price: input.price !== undefined ? new Money(input.price) : undefined,
      cost: input.cost !== undefined ? new Money(input.cost) : undefined,
    });

    if (!updated) {
      throw new BadRequestException("Variant no encontrado");
    }

    return updated;
  }
}
