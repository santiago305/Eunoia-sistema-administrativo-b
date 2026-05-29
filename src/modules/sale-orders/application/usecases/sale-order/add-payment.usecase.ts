import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";

@Injectable()
export class AddSaleOrderPaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async execute(input: {
    saleOrderId: string;
    bankAccountId?: string;
    method: string;
    amount: number;
    date?: string;
    operationNumber?: string;
    note?: string;
  }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");

      const date = input.date ? new Date(input.date) : new Date();
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Fecha de pago inválida");
      }

      const paymentsInput = [
        {
          saleOrderId: input.saleOrderId,
          bankAccountId: input.bankAccountId?.trim() ? input.bankAccountId.trim() : null,
          date,
          method: input.method,
          operationNumber: input.operationNumber ?? null,
          amount: input.amount,
          note: input.note ?? null,
        },
      ];

      try {
        const [created] = await this.paymentRepo.bulkCreate(paymentsInput, tx);
        return { paymentId: created.id };
      } catch (error: any) {
        if (error?.code === "23503") {
          throw new BadRequestException("Cuenta bancaria inválida");
        }
        throw error;
      }
    });
  }
}

