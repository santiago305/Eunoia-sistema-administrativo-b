import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { GetProductByNameInput } from "../../dto/products/input/get-product-by-name";
import { ProductOutput } from "../../dto/products/output/product-out";

export class GetProductByName {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: GetProductByNameInput): Promise<ProductOutput | { type: string, message: string }> {
    const name = input.name?.trim();
    if (!name) return { type: "error", message: "El nombre es obligatorio" };

    const product = await this.productRepo.findByName(name);
    if (!product) throw new NotFoundException({type:"error", message:"Producto no encontrado"});
    
    return {
      id: product.getId()?.value,
      name: product.getName(),
      description: product.getDescription(),
      baseUnitId: product.getBaseUnitId(),
      sku: product.getSku(),
      barcode: product.getBarcode(),
      price: product.getPrice().getAmount(),
      cost: product.getCost().getAmount(),
      attributes: product.getAttributes(),
      isActive: product.getIsActive(),
      type: product.getType(),
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };
  }
}
