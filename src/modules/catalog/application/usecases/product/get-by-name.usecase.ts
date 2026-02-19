import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { GetProductByNameInput } from "../../dto/products/input/get-product-by-name";
import { ProductOutput } from "../../dto/products/output/product-out";

export class GetProductByName {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByNameInput): Promise<ProductOutput> {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('El nombre es obligatorio');

    const product = await this.productRepo.findByName(name);
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
