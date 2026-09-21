import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { RecalculateAccountPayableUsecase } from "src/modules/accounts-payable";

export class VoidPaymentUsecase {
  constructor(
    @InjectRepository(PaymentDocumentEntity)
    private readonly repo: Repository<PaymentDocumentEntity>,
    private readonly recalculateAccountPayable: RecalculateAccountPayableUsecase,
  ) {}

  async execute(input: { paymentId: string; userId: string; reason: string }) {
    const payment = await this.repo.findOne({ where: { id: input.paymentId } });
    if (!payment) throw new NotFoundException("Pago no encontrado");
    if (payment.status !== "POSTED" && payment.status !== "APPROVED") {
      throw new BadRequestException("Solo un pago contabilizado puede anularse");
    }
    if (!input.reason?.trim()) throw new BadRequestException("La anulación requiere un motivo");

    payment.status = "VOIDED";
    payment.rejectedByUserId = input.userId;
    payment.rejectedAt = new Date();
    payment.rejectionReason = input.reason.trim();
    await this.repo.save(payment);
    if (payment.accountPayableId) {
      await this.recalculateAccountPayable.execute({ accountPayableId: payment.accountPayableId });
    }
    return { type: "success" as const, message: "Pago anulado correctamente" };
  }
}
