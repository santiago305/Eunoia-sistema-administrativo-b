import { Product } from "src/modules/catalag/domain/entity/product";
import { CreateProductInput } from "../../dto/products/input/create-product";
import { ProductOutput } from "../../dto/products/output/product-out";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";
import { Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";


export class CreateProduct {
    constructor(
        @Inject(UNIT_OF_WORK)
        private readonly uow: UnitOfWork,
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepo: ProductRepository,
        @Inject(CLOCK)
        private readonly clock: ClockPort,
    ){}

    async execute(input: CreateProductInput): Promise<ProductOutput> {
        return this.uow.runInTransaction(async (tx) => {
            const product = new Product(
           undefined,
            input.name,
            input.description,
            input.isActive ?? true,
            this.clock.now(),
            this.clock.now(),
            );

            const saved = await this.productRepo.created(product, tx);

            return {
            id: (saved as any).id,
            name: (saved as any).name,
            description: (saved as any).description,
            isActive: (saved as any).isActive,
            createdAt: (saved as any).createdAt,
            updatedAt: (saved as any).updatedAt,
            };
        });
    }

}
