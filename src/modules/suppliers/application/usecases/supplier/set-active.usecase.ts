import { Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SetSupplierActiveInput } from "../../dtos/supplier/input/set-active.input";

export class SetSupplierActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(input: SetSupplierActiveInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.supplierRepo.setActive(input.supplierId, input.isActive, tx);
      return { type: "success", message: "Operacion realizada con exito" };
    });
  }
}
