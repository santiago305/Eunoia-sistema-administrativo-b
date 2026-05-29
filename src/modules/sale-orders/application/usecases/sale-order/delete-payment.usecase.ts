import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";

@Injectable()
export class DeleteSaleOrderPaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
  ) {}

  async execute(input: { saleOrderId: string; paymentId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const deleted = await this.paymentRepo.deleteById(
        { saleOrderId: input.saleOrderId, paymentId: input.paymentId },
        tx,
      );
      if (!deleted) throw new BadRequestException("Pago no encontrado");
      return { deleted: true };
    });
  }
}

