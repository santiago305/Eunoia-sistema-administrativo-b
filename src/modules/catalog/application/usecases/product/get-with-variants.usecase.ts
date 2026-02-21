import { Inject } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { GetProductByIdInput } from "../../dto/products/input/get-product-by-id"
import { ProductDetailOutput } from "../../dto/products/output/product-with-variants";

export class GetProductWithVariants {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByIdInput): Promise<ProductDetailOutput | null> {
    const result = await this.productRepo.getByIdWithVariants(ProductId.create(input.id));
    if (!result) return null;

    const product = result.product;
    const variants = result.items;

    return {
      product: {
        id: product.getId()?.value,
        name: product.getName(),
        description: product.getDescription(),
        baseUnitId: product.getBaseUnitId(),
        isActive: product.getIsActive(),
        type: product.getType(),
        createdAt: product.getCreatedAt(),
        updatedAt: product.getUpdatedAt(),
      },
      variants: variants.map((v) => ({
        id: v.getId(),
        productId: v.getProductId().value,
        sku: v.getSku(),
        barcode: v.getBarcode(),
        attributes: v.getAttributes(),
        price: v.getPrice().getAmount(),
        cost: v.getCost().getAmount(),
        isActive: v.getIsActive(),
        createdAt: v.getCreatedAt(),
      })),
    };
  }
}
