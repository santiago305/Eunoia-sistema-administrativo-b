import { Inject, NotFoundException } from "@nestjs/common";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { ACCOUNT_PAYABLE_REPOSITORY, AccountPayableRepository } from "../../domain/ports/account-payable.repository";

export class RecalculateAccountPayableUsecase {
  constructor(
    @Inject(ACCOUNT_PAYABLE_REPOSITORY)
    private readonly payableRepo: AccountPayableRepository,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: { accountPayableId: string }, tx?: any) {
    const payable = await this.payableRepo.findById(input.accountPayableId, tx);
    if (!payable) {
      throw new NotFoundException("Cuenta por pagar no encontrada");
    }

    const approvedPayments = await this.paymentRepo.findApprovedByAccountPayableId(input.accountPayableId, tx);
    const amountPaid = approvedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const updated = payable.withBalance(amountPaid);
    return this.payableRepo.update(updated, tx);
  }
}

