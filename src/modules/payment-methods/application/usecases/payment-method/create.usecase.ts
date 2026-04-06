import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { CreatePaymentMethodInput } from "../../dtos/payment-method/input/create.input";
import { PaymentMethodFactory } from "src/modules/payment-methods/domain/factories/payment-method.factory";

export class CreatePaymentMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  async execute(input: CreatePaymentMethodInput) {
    return this.uow.runInTransaction(async (tx) => {
      const method = PaymentMethodFactory.create(input);

      try {
        const saved = await this.paymentMethodRepo.create(method, tx);
        return successResponse("Metodo de pago creado correctamente", {
          methodId: saved.methodId,
        });
      } catch {
        throw new BadRequestException("No se pudo crear el metodo de pago");
      }
    });
  }
}
