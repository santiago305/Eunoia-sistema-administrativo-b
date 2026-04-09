import { BadRequestException, Inject } from "@nestjs/common";
import { SUPPLIER_SKU_REPOSITORY, SupplierSkuRepository } from "src/modules/suppliers/domain/ports/supplier-sku.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Money } from "src/shared/value-objets/money.vo";
import { UpdateSupplierSkuInput } from "../../dtos/supplier-sku/input/update.input";

export class UpdateSupplierSkuUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_SKU_REPOSITORY)
    private readonly supplierSkuRepo: SupplierSkuRepository,
  ) {}

  async execute(input: UpdateSupplierSkuInput) {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.supplierSkuRepo.findById(input.supplierId, input.skuId, tx);
      if (!existing) throw new BadRequestException("Proveedor sku no encontrado");

      return this.supplierSkuRepo.update(
        {
          supplierId: input.supplierId,
          skuId: input.skuId,
          supplierSku: input.supplierSku,
          lastCost: input.lastCost !== undefined ? Money.create(input.lastCost) : undefined,
          leadTimeDays: input.leadTimeDays,
        },
        tx,
      );
    });
  }
}
