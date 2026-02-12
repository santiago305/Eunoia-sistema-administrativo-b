import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { ListProductVariantsInput } from "../../dto/product-variants/input/list-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { ProductId } from "src/modules/catalog/domain/value-object/product.vo";

export class ListActiveProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: ListProductVariantsInput = {}): Promise<ProductVariantOutput[]> {
    const rows = await this.variantRepo.listActiveByProductId(new ProductId(input.productId));
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

