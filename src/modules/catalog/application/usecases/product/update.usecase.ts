import { ConflictException, Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { UpdateProductInput } from "../../dto/products/input/update-product";
import { Money } from "src/shared/value-objets/money.vo";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";
import { ProductNotFoundApplicationError } from "../../errors/product-not-found.error";

export class UpdateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: UpdateProductInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.productRepo.findById(ProductId.create(input.id), tx);
      if (!current) {
        throw new NotFoundException(new ProductNotFoundApplicationError().message);
      }

      if (input.barcode !== undefined) {
        const newBarcode = input.barcode?.trim() ?? null;
        const currentBarcode = current.getBarcode() ?? null;

        if (newBarcode && newBarcode !== currentBarcode) {
          const existingByBarcode = await this.productRepo.findByBarcode(newBarcode, tx);
          if (existingByBarcode && existingByBarcode.getId()?.value !== current.getId()?.value) {
            throw new ConflictException("El barcode ya existe en otro producto");
          }
        }
      }

      const customSku = input.customSku !== undefined ? (input.customSku?.trim() || null) : undefined;
      const updated = await this.productRepo.update(
        {
          id: ProductId.create(input.id),
          name: input.name,
          description: input.description,
          baseUnitId: input.baseUnitId,
          barcode: input.barcode === null ? null : input.barcode?.trim(),
          customSku,
          price: input.price !== undefined ? Money.create(input.price) : undefined,
          cost: input.cost !== undefined ? Money.create(input.cost) : undefined,
          minStock: input.minStock === undefined ? undefined : input.minStock,
          attributes: input.attributes,
          type: input.type,
        },
        tx,
      );

      if (!updated) {
        throw new InternalServerErrorException("Producto no actualizado, por favor intente de nuevo");
      }

      return {
        type: "success",
        message: "Producto actualizado con éxito",
        product: CatalogOutputMapper.toProductOutput(updated),
      };
    });
  }
}
