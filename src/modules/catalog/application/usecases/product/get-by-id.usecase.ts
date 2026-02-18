import { Inject, NotFoundException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { GetProductByIdInput } from "../../dto/products/input/get-product-by-id";
import { ProductOutput } from "../../dto/products/output/product-out";

export class GetProductById {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByIdInput): Promise<ProductOutput> {
    const product = await this.productRepo.findById(ProductId.create(input.id));
    if (!product) throw new NotFoundException('Producto no encontrado');

    return {
      id: product.getId()?.value,
      name: product.getName(),
      description: product.getDescription(),
      isActive: product.getIsActive(),
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };
  }
}
