import { Inject } from "@nestjs/common";
import { ProductOutput } from "../../dto/products/output/product-out";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";

export class ListActiveProducts {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(): Promise<ProductOutput[]> {
    return this.uow.runInTransaction(async (tx) => {
      const rows = await this.productRepo.listActive(tx);
      return rows.map((p) => ({
        id: p.getId()?.value,
        name: p.getName(),
        description: p.getDescription(),
        isActive: p.getIsActive(),
        createdAt: p.getCreatedAt(),
        updatedAt: p.getUpdatedAt(),
      }));
    });
  }
}
