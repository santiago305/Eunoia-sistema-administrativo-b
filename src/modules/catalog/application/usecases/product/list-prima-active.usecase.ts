import { Inject } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductOutput } from "../../dto/products/output/product-out";

export class ListPrimaActiveProducts {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(): Promise<ProductOutput[]> {
    const items = await this.productRepo.listPrimaActive();
    return items.map((product) => ({
      id: product.getId()?.value,
      name: product.getName(),
      description: product.getDescription(),
      baseUnitId: product.getBaseUnitId(),
      sku: product.getSku(),
      customSku: product.getCustomSku() ?? null,
      barcode: product.getBarcode(),
      price: product.getPrice().getAmount(),
      cost: product.getCost().getAmount(),
      attributes: product.getAttributes(),
      isActive: product.getIsActive(),
      type: product.getType(),
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    }));
  }
}
