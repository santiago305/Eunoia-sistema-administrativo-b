import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { GetSupplierMethodByIdInput } from "../../dtos/supplier-method/input/get-by-id.input";

export class GetSupplierMethodByIdUsecase {
  constructor(
    @Inject(SUPPLIER_METHOD_REPOSITORY)
    private readonly supplierMethodRepo: SupplierMethodRepository,
  ) {}

  async execute(input: GetSupplierMethodByIdInput) {
    const existing = await this.supplierMethodRepo.findById(input.supplierId, input.methodId);
    if (!existing) {
      throw new NotFoundException(errorResponse("Relacion no encontrada"));
    }

    return successResponse("Relacion encontrada", {
      supplierId: existing.supplierId,
      methodId: existing.methodId,
      number: existing.number,
    });
  }
}
