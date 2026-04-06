import { Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SetSupplierActiveInput } from "../../dtos/supplier/input/set-active.input";
import { SupplierNotFoundError } from "../../errors/supplier-not-found.error";

export class SetSupplierActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(input: SetSupplierActiveInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const exist = await this.supplierRepo.findById(input.supplierId, tx);

      if (!exist) {
        throw new NotFoundException(new SupplierNotFoundError().message);
      }

      try {
        await this.supplierRepo.setActive(input.supplierId, input.isActive, tx);
        return { message: "Operacion realizada con exito" };
      } catch {
        throw new InternalServerErrorException("No se pudo cambiar el estado del proveedor");
      }
    });
  }
}
