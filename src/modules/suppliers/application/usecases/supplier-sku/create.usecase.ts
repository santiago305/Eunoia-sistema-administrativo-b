import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SUPPLIER_SKU_REPOSITORY, SupplierSkuRepository } from "src/modules/suppliers/domain/ports/supplier-sku.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Money } from "src/shared/value-objets/money.vo";
import { SupplierFactory } from "src/modules/suppliers/domain/factories/supplier.factory";
import { SupplierNotFoundError } from "../../errors/supplier-not-found.error";
import { CreateSupplierSkuInput } from "../../dtos/supplier-sku/input/create.input";

export class CreateSupplierSkuUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(SUPPLIER_SKU_REPOSITORY)
    private readonly supplierSkuRepo: SupplierSkuRepository,
  ) {}

  async execute(input: CreateSupplierSkuInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const supplier = await this.supplierRepo.findById(input.supplierId, tx);
      if (!supplier) throw new NotFoundException(new SupplierNotFoundError().message);
      if (!supplier.isActive) throw new BadRequestException("Proveedor inactivo");

      const sku = await this.skuRepo.findById(input.skuId);
      if (!sku) throw new NotFoundException("Sku no encontrado");

      const existing = await this.supplierSkuRepo.findById(input.supplierId, input.skuId, tx);
      if (existing) throw new BadRequestException("El proveedor sku ya existe");

      const supplierSku = SupplierFactory.createSupplierSku({
        supplierId: input.supplierId,
        skuId: sku.sku.id!,
        supplierSku: input.supplierSku,
        lastCost: input.lastCost !== undefined ? Money.create(input.lastCost) : undefined,
        leadTimeDays: input.leadTimeDays,
      });

      await this.supplierSkuRepo.create(supplierSku, tx);
      return { message: "Operacion realizada con exito" };
    });
  }
}
