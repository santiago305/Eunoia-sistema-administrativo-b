import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/application/ports/product-variant.repository";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SUPPLIER_VARIANT_REPOSITORY, SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Money } from "src/shared/value-objets/money.vo";
import { CreateSupplierVariantInput } from "../../dtos/supplier-variant/input/create.input";
import { SupplierFactory } from "src/modules/suppliers/domain/factories/supplier.factory";
import { SupplierNotFoundError } from "../../errors/supplier-not-found.error";

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

  async execute(input: CreateSupplierVariantInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const supplier = await this.supplierRepo.findById(input.supplierId, tx);
      if (!supplier) {
        throw new NotFoundException(new SupplierNotFoundError().message);
      }

      if (!supplier.isActive) {
        throw new BadRequestException("Proveedor inactivo");
      }

      const productVariant = await this.productVariantRepo.findById(input.variantId, tx);
      if (!productVariant) {
        throw new NotFoundException("Variante de producto no encontrada");
      }

      const existingVariant = await this.supplierVariantRepo.findById(
        input.supplierId,
        input.variantId,
        tx,
      );

      if (existingVariant) {
        throw new BadRequestException("El proveedor variante ya existe");
      }

      const variant = SupplierFactory.createSupplierVariant({
        supplierId: input.supplierId,
        variantId: input.variantId,
        supplierSku: input.supplierSku,
        lastCost: input.lastCost !== undefined ? Money.create(input.lastCost) : undefined,
        leadTimeDays: input.leadTimeDays,
      });

      try {
        await this.supplierVariantRepo.create(variant, tx);
      } catch {
        throw new BadRequestException("Error al crear el proveedor variante");
      }

      return { message: "Operacion realizada con exito" };
    });
  }
}
