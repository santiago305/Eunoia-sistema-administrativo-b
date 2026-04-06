import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { successResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { GetPaymentMethodsBySupplierInput } from "../../dtos/payment-method/input/get-by-supplier.input";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

export class GetPaymentMethodsBySupplierUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}
  async execute(input: GetPaymentMethodsBySupplierInput) {
    const supplier = await this.supplierRepo.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException("Proveedor no encontrado");
    }

    const methods = await this.paymentMethodRepo.getBySupplier(input.supplierId);
    return successResponse(
      "Metodos de pago encontrados",
      methods.map((method) => PaymentMethodOutputMapper.toOutputWithNumber(method)),
    );
  }
}
