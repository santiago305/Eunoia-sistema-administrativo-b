import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { UpdateProductInput } from "../../dto/products/input/update-product";
import { ProductOutput } from "../../dto/products/output/product-out";

export class UpdateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: UpdateProductInput): Promise<ProductOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const updated = await this.productRepo.update(
        {
          id: ProductId.create(input.id),
          name: input.name,
          description: input.description ?? null,
        },
        tx,
      );

      if (!updated) throw new NotFoundException('Producto no encontrado');

      return {
        id: updated.getId()?.value,
        name: updated.getName(),
        description: updated.getDescription(),
        isActive: updated.getIsActive(),
        createdAt: updated.getCreatedAt(),
        updatedAt: updated.getUpdatedAt(),
      };
    });
  }
}
