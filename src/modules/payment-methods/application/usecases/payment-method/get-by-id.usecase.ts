import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";
import { GetPaymentMethodByIdInput } from "../../dtos/payment-method/input/get-by-id.input";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";

export class GetPaymentMethodByIdUsecase {
  constructor(
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

  async execute(input: GetPaymentMethodByIdInput) {
    const method = await this.paymentMethodRepo.findById(input.methodId);
    if (!method) {
      throw new NotFoundException(errorResponse("Metodo de pago no encontrado"));
    }

    return successResponse("Metodo de pago encontrado", this.toOutput(method));
  }
}
