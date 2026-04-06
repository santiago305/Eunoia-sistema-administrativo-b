import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { GetPaymentMethodByIdInput } from "../../dtos/payment-method/input/get-by-id.input";
import { PaymentMethodNotFoundError } from "../../errors/payment-method-not-found.error";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

export class GetPaymentMethodByIdUsecase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}
  async execute(input: GetPaymentMethodByIdInput) {
    const method = await this.paymentMethodRepo.findById(input.methodId);
    if (!method) {
      throw new NotFoundException(new PaymentMethodNotFoundError().message);
    }

    return successResponse("Metodo de pago encontrado", PaymentMethodOutputMapper.toOutput(method));
  }
}
