import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { GetSupplierMethodByIdInput } from "../../dtos/supplier-method/input/get-by-id.input";
import { PaymentMethodRelationNotFoundError } from "../../errors/payment-method-relation-not-found.error";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

export class GetSupplierMethodByIdUsecase {
  constructor(
    @Inject(SUPPLIER_METHOD_REPOSITORY)
    private readonly supplierMethodRepo: SupplierMethodRepository,
  ) {}

  async execute(input: GetSupplierMethodByIdInput) {
    const existing = await this.supplierMethodRepo.findDetailById(input.supplierMethodId);
    if (!existing) {
      throw new NotFoundException(new PaymentMethodRelationNotFoundError().message);
    }

    return successResponse("Relacion encontrada", PaymentMethodOutputMapper.toSupplierMethodOutput(existing));
  }
}
