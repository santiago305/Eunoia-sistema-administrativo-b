import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { ListProductVariantsInput } from "../../dto/inputs";
import { ProductVariantOutput } from "../../dto/outputs";
import { ProductId } from "src/modules/catalag/domain/value-object/product.vo";

export class ListInactiveProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: ListProductVariantsInput = {}): Promise<ProductVariantOutput[]> {
    const rows = input.productId
      ? await this.variantRepo.listInactiveByProductId(new ProductId(input.productId))
      : await this.variantRepo.listAllInactive();

    return rows.map((v: any) => ({
      id: v.id,
      productId: v.product_id?.value ?? v.productId,
      sku: v.sku,
      barcode: v.barcode,
      attributes: v.attributes,
      price: v.price?.getAmount?.() ?? v.price,
      cost: v.cost?.getAmount?.() ?? v.cost,
      isActive: v.isActive,
      createdAt: v.createdAt,
    }));
  }
}
