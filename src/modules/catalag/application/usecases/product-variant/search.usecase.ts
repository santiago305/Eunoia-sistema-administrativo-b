import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { ListProductVariantsInput } from "../../dto/inputs";
import { ProductVariantOutput } from "../../dto/outputs";
import { ProductId } from "src/modules/catalag/domain/value-object/product.vo";

export class SearchProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: ListProductVariantsInput): Promise<ProductVariantOutput[]> {
    const results: any[] = [];

    if (input.sku) {
      const bySku = await this.variantRepo.findBySku(input.sku);
      if (bySku) results.push(bySku);
    }

    if (input.barcode) {
      const byBarcode = await this.variantRepo.findByBarcode(input.barcode);
      if (byBarcode) results.push(byBarcode);
    }

    if (input.productId) {
      const byProduct = await this.variantRepo.listByProductId(new ProductId(input.productId));
      results.push(...byProduct);
    }

    const seen = new Set<string>();
    const unique = results.filter((v: any) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    return unique.map((v: any) => ({
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
