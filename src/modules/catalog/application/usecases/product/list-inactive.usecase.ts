import { Inject } from "@nestjs/common";
import { ProductOutput } from "../../dto/products/output/product-out";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";

export class ListInactiveProducts {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(): Promise<ProductOutput[]> {
    return this.uow.runInTransaction(async (tx) => {
      const rows = await this.productRepo.listInactive(tx);
      return rows.map((p) => ({
        id: p.getId()?.value,
        name: p.getName(),
        description: p.getDescription(),
        baseUnitId: p.getBaseUnitId(),
        isActive: p.getIsActive(),
        type: p.getType(),
        createdAt: p.getCreatedAt(),
        updatedAt: p.getUpdatedAt(),
      }));
    });
  }
}
