import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";
import { GetProductVariantInput } from "../../dto/product-variants/input/get-by-id-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";

export class GetProductVariant {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: GetProductVariantInput) {
    const variant = await this.variantRepo.findById(input.id);
    if (!variant) {
      throw new BadRequestException("Variant no encontrado");
    }
    return this.toOutput(variant);
  }
  private toOutput(v: ProductVariant): ProductVariantOutput {
      return {
        id: v.getId(),
        productId: v.getProductId().value,
        sku: v.getSku(),
        barcode: v.getBarcode(),
        attributes: v.getAttributes(),
        price: v.getPrice().getAmount(),
        cost: v.getCost().getAmount(),
        isActive: v.getIsActive(),
        createdAt: v.getCreatedAt(),
      };
    }
}

