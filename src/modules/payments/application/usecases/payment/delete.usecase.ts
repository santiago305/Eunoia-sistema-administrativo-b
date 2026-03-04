import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";

export class DeletePaymentUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(payDocId: string): Promise<{ type: string; message: string }> {
    const existing = await this.paymentDocRepo.findById(payDocId);
    if (!existing) {
      throw new NotFoundException({
        type: "error",
        message: "Pago no encontrado",
      });
    }

    try {
      await this.paymentDocRepo.deleteById(payDocId);
    } catch {
      throw new BadRequestException({
        type: "error",
        message: "No se pudo eliminar el pago",
      });
    }

    return { type: "success", message: "Pago eliminado con exito" };
  }
}
