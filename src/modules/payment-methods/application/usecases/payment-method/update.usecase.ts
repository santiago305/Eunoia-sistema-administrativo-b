import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { UpdatePaymentMethodInput } from "../../dtos/payment-method/input/update.input";

export class UpdatePaymentMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  async execute(input: UpdatePaymentMethodInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.paymentMethodRepo.findById(input.methodId, tx);
      if (!current) {
        throw new NotFoundException(errorResponse("Metodo de pago no encontrado"));
      }

      try {
        const saved = await this.paymentMethodRepo.update(
          {
            methodId: input.methodId,
            name: input.name,
            number: input.number,
          },
          tx,
        );

        if (!saved) {
          throw new BadRequestException(errorResponse("No se pudo actualizar el metodo de pago"));
        }

        return successResponse("Metodo de pago actualizado correctamente", {
          methodId: saved.methodId,
        });
      } catch {
        throw new BadRequestException(errorResponse("No se pudo actualizar el metodo de pago"));
      }
    });
  }
}
