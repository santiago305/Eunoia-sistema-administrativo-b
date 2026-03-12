import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { SetPaymentMethodActiveInput } from "../../dtos/payment-method/input/set-active.input";

export class SetPaymentMethodActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  async execute(input: SetPaymentMethodActiveInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.paymentMethodRepo.findById(input.methodId, tx);
      if (!current) {
        throw new NotFoundException(errorResponse("Metodo de pago no encontrado"));
      }

      try {
        const updated = await this.paymentMethodRepo.setActive(input.methodId, input.isActive, tx);
        if (!updated) {
          throw new BadRequestException(errorResponse("No se pudo actualizar el estado"));
        }

        return successResponse("Estado actualizado correctamente", {
          methodId: updated.methodId,
          isActive: updated.isActive,
        });
      } catch {
        throw new BadRequestException(errorResponse("No se pudo actualizar el estado"));
      }
    });
  }
}
