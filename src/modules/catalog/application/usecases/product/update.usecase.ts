import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { UpdateProductInput } from "../../dto/products/input/update-product";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { UpdateProductVariant } from "../product-variant/update.usecase";
export class UpdateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    private readonly updateProductVariant: UpdateProductVariant,
  ) {}

  async execute(input: UpdateProductInput): Promise<{type:string, message:string, id:string} >{
    return this.uow.runInTransaction(async (tx) => {
      const updated = await this.productRepo.update(
        {
          id: ProductId.create(input.id),
          name: input.name,
          description: input.description ?? null,
          baseUnitId: input.baseUnitId,
          variantDefaulId: input.variantDefaulId ?? null,
          type: input.type ?? null,
        },
        tx,
      );
      if (!updated) throw new NotFoundException(
        {
          type: "error",
          message: "Producto no encontrado",
        }
      );

      //buscar la variante por defecto
      const variantDefault = await this.variantRepo.findById(updated.getVariantDefaultId(),tx);
      if(variantDefault){
        //actualizar la variante por defecto
        const updateVariantDefault = await this.updateProductVariant.execute({
          id: variantDefault.getId(),
          price: input.price,
          cost: input.cost,
          attributes: input.attributes
        });
        if(!updateVariantDefault) throw new NotFoundException(
          {
            type: "error",
            message: "Error al actualizar la variante por defecto del producto",
          }
        );
      }


      return {
        type: "success",
        message: "Producto actualizado con éxito",
        id: updated.getId()?.value || "",
      };
    });
  }
}
