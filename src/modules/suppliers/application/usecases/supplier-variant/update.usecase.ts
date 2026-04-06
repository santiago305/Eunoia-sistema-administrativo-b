import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_VARIANT_REPOSITORY, SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Money } from "src/shared/value-objets/money.vo";
import { UpdateSupplierVariantInput } from "../../dtos/supplier-variant/input/update.input";
import { SupplierVariantNotFoundError } from "../../errors/supplier-variant-not-found.error";

export class UpdateSupplierVariantUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_VARIANT_REPOSITORY)
    private readonly supplierVariantRepo: SupplierVariantRepository,
  ) {}

  async execute(input: UpdateSupplierVariantInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const updated = await this.supplierVariantRepo.update(
        {
          supplierId: input.supplierId,
          variantId: input.variantId,
          supplierSku: input.supplierSku,
          lastCost: input.lastCost !== undefined ? Money.create(input.lastCost) : undefined,
          leadTimeDays: input.leadTimeDays,
        },
        tx,
      );

      if (!updated) {
        throw new NotFoundException(new SupplierVariantNotFoundError().message);
      }

      return { message: "Operacion realizada con exito" };
    });
  }
}
