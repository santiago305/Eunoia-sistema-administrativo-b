import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { GetProductVariantInput } from "../../dto/product-variants/input/get-by-id-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";

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
    return this.toOutput(variant);
  }
  private toOutput(v: any): ProductVariantOutput {
      return {
        id: v.id,
        productId: v.product_id?.value ?? v.productId,
        sku: v.sku,
        barcode: v.barcode,
        attributes: v.attributes,
        price: v.price?.getAmount?.() ?? v.price,
        cost: v.cost?.getAmount?.() ?? v.cost,
        isActive: v.isActive,
        createdAt: v.createdAt,
      };
    }
}
