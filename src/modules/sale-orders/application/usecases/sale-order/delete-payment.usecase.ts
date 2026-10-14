import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";

@Injectable()
export class DeleteSaleOrderPaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_PAYMENT_REPOSITORY) private readonly paymentRepo: SalePaymentRepository,
  ) {}

  async execute(input: { saleOrderId: string; paymentId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const payments = await this.paymentRepo.listBySaleOrderId(input.saleOrderId, tx);
      const payment = payments.find((item) => item.id === input.paymentId);
      if (!payment) throw new NotFoundException("Pago no encontrado");
      throw new ConflictException({
        code: "FINANCIAL_HISTORY_IMMUTABLE",
        message: payment.status === "PENDING_CONFIRMATION"
          ? "Los ingresos pendientes no se borran; utiliza Cancelar ingreso para conservar auditoría."
          : "Los ingresos persistidos no se pueden eliminar.",
      });
    });
  }
}
