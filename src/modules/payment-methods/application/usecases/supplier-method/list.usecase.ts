import { Inject, NotFoundException } from "@nestjs/common";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";
import { ListSupplierMethodsInput } from "../../dtos/supplier-method/input/list.input";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { successResponse } from "src/shared/response-standard/response";

export class ListSupplierMethodsUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(SUPPLIER_METHOD_REPOSITORY)
    private readonly supplierMethodRepo: SupplierMethodRepository,
  ) {}

  async execute(input: ListSupplierMethodsInput) {
    const supplier = await this.supplierRepo.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException("Proveedor no encontrado");
    }

    const rows = await this.supplierMethodRepo.listBySupplier(input.supplierId);
    return successResponse(
      "Relaciones encontradas",
      rows.map((row) => PaymentMethodOutputMapper.toSupplierMethodOutput(row)),
    );
  }
}
