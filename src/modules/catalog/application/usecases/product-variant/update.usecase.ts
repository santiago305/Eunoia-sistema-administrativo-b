import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { UpdateProductVariantInput } from "../../dto/product-variants/input/update-product-variant";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";

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

    return this.toOutput(updated);
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

