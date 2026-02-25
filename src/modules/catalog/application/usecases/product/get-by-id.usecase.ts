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
    if (!product) throw new NotFoundException({ type: "error",  message: "Producto no encontrado" });

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
