import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";
import { GetPaymentMethodsBySupplierInput } from "../../dtos/payment-method/input/get-by-supplier.input";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";

export class GetPaymentMethodsBySupplierUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  private toOutput(method: PaymentMethod): PaymentMethodOutput {
    return {
      methodId: method.methodId!,
      name: method.name,
      number: method.number,
      isActive: method.isActive,
    };
  }

  async execute(input: GetPaymentMethodsBySupplierInput) {
    const supplier = await this.supplierRepo.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException(errorResponse("Proveedor no encontrado"));
    }

    const methods = await this.paymentMethodRepo.getBySupplier(input.supplierId);
    return successResponse("Metodos de pago encontrados", methods.map((m) => this.toOutput(m)));
  }
}
