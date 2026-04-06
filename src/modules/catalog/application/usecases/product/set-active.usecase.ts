import { Inject, NotFoundException } from "@nestjs/common";
import { SetProductActiveInput } from "../../dto/products/input/set-active-product";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { ProductNotFoundApplicationError } from "../../errors/product-not-found.error";

export class SetProductActive {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: SetProductActiveInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const productId = ProductId.create(input.id);
      const product = await this.productRepo.findById(productId, tx);

      if (!product) {
        throw new NotFoundException(new ProductNotFoundApplicationError().message);
      }

      await this.productRepo.setActive(productId, input.isActive, tx);
      await this.productRepo.setAllVariantsActive(productId, input.isActive, tx);

      return { message: "Operacion realizada con exito" };
    });
  }
}
