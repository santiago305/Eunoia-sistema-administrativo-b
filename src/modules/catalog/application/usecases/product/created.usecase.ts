import { Inject, NotFoundException } from "@nestjs/common";
import { Product } from "src/modules/catalog/domain/entity/product";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { CreateProductInput } from "../../dto/products/input/create-product";
import { ProductOutput } from "../../dto/products/output/product-out";
import { CreateProductVariant } from "../product-variant/create.usecase"; 
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";

export class CreateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly createProductVariant: CreateProductVariant,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const now = this.clock.now();

      const product = new Product(
        undefined,
        input.name,
        input.description ?? null,
        input.baseUnitId,
        input.isActive ?? true,
        undefined,
        now,
        now,
        input.type,
      );

      const saved = await this.productRepo.create(product, tx);
      
      //Crear variante por defecto
      const variantId = await this.createProductVariant.execute({
        productId: saved.getId()?.value,
        price: input.price,
        cost: input.cost,
        attributes: input.attributes
      }, tx);

      //actualizar producto con id de variante por defecto
      const updatedProduct = await this.productRepo.update(
        {
          id: saved.getId()!,
          variantDefaulId: variantId.id,
        },
        tx
      );

      //buscar la variante por defecto
      const defaultVariant = await this.variantRepo.findById(variantId.id, tx);
      if (!updatedProduct || !defaultVariant) {
        throw new NotFoundException(
          {
            type: "error",
            message: "Error al crear el producto y su variante por defecto",
          }
        );
      }


      return {
        id: saved.getId()?.value,
        name: saved.getName(),
        description: saved.getDescription(),
        baseUnitId: saved.getBaseUnitId(),
        sku: defaultVariant.getSku(),
        cost: defaultVariant.getCost().getAmount(),
        price: defaultVariant.getPrice().getAmount(),
        attributes: defaultVariant.getAttributes(),
        type: saved.getType(),
        isActive: saved.getIsActive(),
        createdAt: saved.getCreatedAt(),
        updatedAt: saved.getUpdatedAt(),
      };
    });
  }
}
