import { Inject } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { GetProductInput } from "../../dto/products/input/get-by-id-product";
import { ProductDetailOutput } from "../../dto/products/output/product-with-variants";

export class GetProductWithVariants {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductInput): Promise<ProductDetailOutput | null> {
    const result = await this.productRepo.getByIdWithVariants(input.id);
    if (!result) return null;

    const product: any = result.product;
    const variants = result.items ?? [];

    return {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
      variants: variants.map((v: any) => ({
        id: v.id,
        productId: v.product_id?.value ?? v.productId ?? input.id,
        sku: v.sku,
        barcode: v.barcode,
        attributes: v.attributes,
        price: v.price?.getAmount?.() ?? v.price,
        cost: v.cost?.getAmount?.() ?? v.cost,
        isActive: v.isActive,
        createdAt: v.createdAt,
      })),
    };
  }
}

