import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";
import { GetPaymentMethodsBySupplierInput } from "../../dtos/payment-method/input/get-by-supplier.input";
import { PaymentMethodWithNumber } from "src/modules/payment-methods/domain/ports/payment-method.repository";

export class GetPaymentMethodsBySupplierUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  private toOutput(item: PaymentMethodWithNumber): PaymentMethodOutput {
    return {
      methodId: item.method.methodId!,
      name: item.method.name,
      number: item.number ?? undefined,
      isActive: item.method.isActive,
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
