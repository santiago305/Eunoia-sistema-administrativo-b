import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { SupplierVariant } from "src/modules/suppliers/domain/entity/supplierVariant";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SUPPLIER_VARIANT_REPOSITORY, SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { CreateSupplierVariantInput } from "../../dtos/supplier-variant/input/create.input";

export class CreateSupplierVariantUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly productVariantRepo: ProductVariantRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(SUPPLIER_VARIANT_REPOSITORY)
    private readonly supplierVariantRepo: SupplierVariantRepository,
  ) {}

  async execute(input: CreateSupplierVariantInput): Promise<{type:string,message:string}> {
    return this.uow.runInTransaction(async (tx) => {
      const supplier = await this.supplierRepo.findById(input.supplierId, tx);
      if (!supplier) {
        throw new NotFoundException({
          type: "error",
          message: "Proveedor no encontrado"
        });
      }
      if (!supplier.isActive) {
        throw new BadRequestException({
          type: "error",
          message: "Proveedor inactivo"
        });
      }

      const productVariant = await this.productVariantRepo.findById(input.variantId, tx);
      if (!productVariant) {
        throw new NotFoundException({
          type: "error",
          message: "Variante de producto no encontrada"
        });
      }
      
      const existingVariant = await this.supplierVariantRepo.findById(input.supplierId, input.variantId, tx);
      if (existingVariant) {
        throw new BadRequestException({
          type: "error",
          message: "El proveedor variante ya existe"
        });
      }

      

      const variant = new SupplierVariant(
        input.supplierId,
        input.variantId,
        input.supplierSku,
        input.lastCost !== undefined ? Money.create(input.lastCost) : undefined,
        input.leadTimeDays,
      );

      try {
        await this.supplierVariantRepo.create(variant, tx);
      } catch{
        throw new BadRequestException({
          type: "error",
          message: "Error al crear el proveedor variante"
        });
      }
      return {
        type: "success",
        message: "¡Operación lograda con exito!",
      };
    });
  }
}
