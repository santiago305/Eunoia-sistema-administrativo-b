import { ConflictException, Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { UpdateProductInput } from "../../dto/products/input/update-product";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { buildSkuPreservingSeries } from "src/shared/utilidades/utils/updateSku";
export class UpdateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: UpdateProductInput): Promise<{type:string, message:string, id:string} >{
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.productRepo.findById(ProductId.create(input.id), tx);
      if (!current) throw new NotFoundException(
        {
          type: "error",
          message: "Producto no encontrado",
        }
      );
      if (input.barcode !== undefined) {
        const newBarcode = input.barcode?.trim() ?? null;
        const currentBarcode = current.getBarcode() ?? null;

        if (newBarcode && newBarcode !== currentBarcode) {
          const existingByBarcode = await this.productRepo.findByBarcode(newBarcode, tx);
          if (existingByBarcode && existingByBarcode.getId()?.value !== current.getId()?.value) {
            throw new ConflictException({ type: "error", message: "El barcode ya existe en otro producto" });
          }
        }
      }
        
      let sku = current.getSku();

      if (input.sku?.trim()) {
        sku = input.sku.trim();
      }

      if (input.attributes) {
        sku = buildSkuPreservingSeries(
          sku,
          input.name ?? current.getName(),
          input.attributes?.color,
          input.attributes?.presentation,
          input.attributes?.variant,
        );
      }
      if (sku !== current.getSku()) {
        const existingBySku = await this.productRepo.findBySku(sku, tx);
        if (existingBySku && existingBySku.getId()?.value !== current.getId()?.value) {
          throw new ConflictException({ type: "error", message: "El SKU ya existe en otro producto" });
        }
      }
      const updated = await this.productRepo.update(
      {
        id: ProductId.create(input.id),
        name: input.name,
        description: input.description,
        baseUnitId: input.baseUnitId,
        sku: sku,
        barcode: input.barcode === null ? null : input.barcode?.trim(),
        price: input.price !== undefined ? Money.create(input.price) : undefined,
        cost: input.cost !== undefined ? Money.create(input.cost) : undefined,
        attributes: input.attributes,
        type: input.type,
      },
      tx,
    );
      if (!updated) throw new InternalServerErrorException(
        {
          type: "error",
          message: "Producto no actualizado, por favor intente de nuevo",
        }
      );

      return {
        type: "success",
        message: "Producto actualizado con éxito",
        id: updated.getId()?.value || "",
      };
    });
  }
}
