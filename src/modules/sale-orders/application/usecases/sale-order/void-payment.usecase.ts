import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

@Injectable()
export class VoidSaleOrderPaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_PAYMENT_REPOSITORY) private readonly paymentRepo: SalePaymentRepository,
  ) {}

  async execute(input: {
    saleOrderId: string;
    paymentId: string;
    executedBy: string;
    reason: string;
  }) {
    const reason = input.reason?.trim() ?? "";
    if (reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException({
        code: "INCOME_VOID_REASON_REQUIRED",
        message: "Ingresa un motivo de al menos 5 caracteres.",
      });
    }
    if (reason.length > MAX_REASON_LENGTH) {
      throw new BadRequestException({
        code: "INCOME_VOID_REASON_TOO_LONG",
        message: "El motivo no puede superar los 500 caracteres.",
      });
    }
    if (!input.executedBy) {
      throw new BadRequestException("No se pudo identificar al usuario autenticado");
    }

    return this.uow.runInTransaction(async (tx) => {
      const payment = await this.paymentRepo.voidPostedPayment(
        {
          saleOrderId: input.saleOrderId,
          paymentId: input.paymentId,
          voidedByUserId: input.executedBy,
          voidReason: reason,
          voidedAt: new Date(),
        },
        tx,
      );

      if (!payment) {
        throw new NotFoundException({
          code: "SALE_PAYMENT_NOT_FOUND",
          message: "El ingreso ya no existe o no pertenece al pedido.",
        });
      }
      if (payment.transitioned) {
        return {
          type: "success" as const,
          message: "Ingreso anulado correctamente",
          data: {
            incomeId: payment.payment.id,
            saleOrderId: payment.payment.saleOrderId,
            status: payment.payment.status,
            amount: payment.payment.amount,
            voidedAt: payment.payment.voidedAt?.toISOString() ?? null,
            voidedByUserId: payment.payment.voidedByUserId,
            voidReason: payment.payment.voidReason,
          },
        };
      }
      if (payment.payment.status === "VOIDED") {
        throw new ConflictException({
          code: "SALE_PAYMENT_ALREADY_VOIDED",
          message: "Este ingreso ya fue anulado. Actualiza la información.",
        });
      }
      throw new ConflictException({
        code: "SALE_PAYMENT_NOT_POSTED",
        message: "Solo se puede anular un ingreso contabilizado.",
      });
    });
  }
}
