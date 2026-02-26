import { Inject, NotFoundException } from "@nestjs/common";
import { SetProductActiveInput } from "../../dto/products/input/set-active-product";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";

export class SetProductActive {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: SetProductActiveInput): Promise<{ type:string, message:string }> {
    return this.uow.runInTransaction(async (tx) => {
      const productId = ProductId.create(input.id);

      const product = await this.productRepo.findById(productId, tx);
      if (!product) {
        throw new NotFoundException({ type: "error", message: "Producto no encontrado" });
      }

      await this.productRepo.setActive(productId, input.isActive, tx);
      await this.productRepo.setAllVariantsActive(productId, input.isActive, tx);

      return { type: "success", message: "Operación lograda con éxito" };
    });
  }
}
