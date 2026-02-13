import { Inject } from "@nestjs/common";
import { SetProductActiveInput } from "../../dto/products/input/set-active-product";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";

export class SetProductActive {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: SetProductActiveInput): Promise<{ status: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const productId = ProductId.create(input.id);
      await this.productRepo.setActive(productId, input.isActive, tx);
      await this.productRepo.setAllVariantsActive(productId, input.isActive, tx);
      return { status: "Operacion lograda con exito" };
    });
  }
}
