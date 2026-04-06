import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { GetSupplierMethodByIdInput } from "../../dtos/supplier-method/input/get-by-id.input";
import { PaymentMethodRelationNotFoundError } from "../../errors/payment-method-relation-not-found.error";

export class DeleteSupplierMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_METHOD_REPOSITORY)
    private readonly supplierMethodRepo: SupplierMethodRepository,
  ) {}

  async execute(input: GetSupplierMethodByIdInput) {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.supplierMethodRepo.findById(input.supplierId, input.methodId, tx);
      if (!existing) {
        throw new NotFoundException(new PaymentMethodRelationNotFoundError().message);
      }

      try {
        const deleted = await this.supplierMethodRepo.delete(input.supplierId, input.methodId, tx);
        if (!deleted) {
          throw new BadRequestException("No se pudo eliminar la relacion");
        }
        return successResponse("Relacion eliminada correctamente", {
          supplierId: input.supplierId,
          methodId: input.methodId,
        });
      } catch {
        throw new BadRequestException("No se pudo eliminar la relacion");
      }
    });
  }
}
