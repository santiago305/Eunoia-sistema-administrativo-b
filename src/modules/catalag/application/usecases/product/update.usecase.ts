import { Inject, BadRequestException } from "@nestjs/common";
import { UpdateProductInput } from "../../dto/inputs";
import { ProductOutput } from "../../dto/outputs";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";

export class UpdateProduct {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: UpdateProductInput): Promise<ProductOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const updated = await this.productRepo.updated(
        { id: input.id, name: input.name, description: input.description },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("Producto no encontrado");
      }

      return {
        id: (updated as any).id,
        name: (updated as any).name,
        description: (updated as any).description,
        isActive: (updated as any).isActive,
        createdAt: (updated as any).createdAt,
        updatedAt: (updated as any).updatedAt,
      };
    });
  }
}
