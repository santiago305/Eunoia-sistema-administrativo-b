import { Inject } from "@nestjs/common";
import { SetProductActiveInput } from "../../dto/products/input/set-active-product";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";

export class SetProductActive {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: SetProductActiveInput): Promise<{ ok: true }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.productRepo.setActive(input.id, input.isActive, tx);
      return { ok: true };
    });
  }
}
