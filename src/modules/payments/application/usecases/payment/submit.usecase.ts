import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { PURCHASE_ATTACHMENT_REPOSITORY, PurchaseAttachmentRepository } from "src/modules/purchase-attachments/domain/ports/purchase-attachment.repository";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SupplierPaymentDestinationEntity } from "src/modules/supplier-payment-destinations/adapters/out/persistence/typeorm/entities/supplier-payment-destination.entity";
import { PaymentFinancialPolicy } from "src/modules/payments/domain/services/payment-financial-policy";

@Injectable()
export class SubmitPaymentUsecase {
  constructor(
    @InjectRepository(PaymentDocumentEntity)
    private readonly paymentRepo: Repository<PaymentDocumentEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methodRepo: Repository<PaymentMethodEntity>,
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly accountRepo: Repository<CompanyPaymentAccountEntity>,
    @InjectRepository(SupplierPaymentDestinationEntity)
    private readonly destinationRepo: Repository<SupplierPaymentDestinationEntity>,
    @Inject(PURCHASE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: PurchaseAttachmentRepository,
  ) {}

  async execute(paymentId: string, requestedByUserId?: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new BadRequestException("Pago no encontrado");
    if (payment.status !== "DRAFT") throw new BadRequestException("Solo se pueden enviar pagos en borrador");

    const method = payment.paymentMethodId
      ? await this.methodRepo.findOne({ where: { id: payment.paymentMethodId } })
      : null;
    if (!method || !method.isActive) throw new BadRequestException("El metodo de pago no esta disponible");
    const account = payment.companyPaymentAccountId
      ? await this.accountRepo.findOne({ where: { id: payment.companyPaymentAccountId } })
      : null;
    const destination = payment.supplierPaymentDestinationId
      ? await this.destinationRepo.findOne({ where: { id: payment.supplierPaymentDestinationId } })
      : null;
    try {
      PaymentFinancialPolicy.validate({
        method: {
          code: method.code,
          isActive: method.isActive,
          requiresSourceAccount: method.requiresSourceAccount,
          requiresDestination: method.requiresDestination,
          requiresOperationReference: method.requiresOperationReference,
          requiresVoucher: method.requiresVoucher,
        },
        account: account
          ? { id: account.id, isActive: account.isActive, currency: account.currency, usage: account.usage, type: account.type }
          : null,
        destination: destination
          ? { id: destination.id, isActive: destination.isActive, requiresManualReview: destination.requiresManualReview, currency: destination.currency, methodId: destination.methodId }
          : null,
        paymentMethodId: payment.paymentMethodId,
        currency: payment.currency,
        operationNumber: payment.operationNumber,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "El pago no cumple la politica financiera");
    }
    if (method.requiresVoucher) {
      const evidence = await this.attachmentRepo.list({
        paymentId,
        type: PurchaseAttachmentType.PAYMENT_PROOF,
      });
      if (!evidence.length) throw new BadRequestException("Adjunta la evidencia requerida antes de enviar el pago");
    }

    payment.status = payment.scheduledAt ? "SCHEDULED" : "PENDING_APPROVAL";
    payment.requestedByUserId = requestedByUserId ?? payment.requestedByUserId;
    await this.paymentRepo.save(payment);
    return {
      type: "success" as const,
      message: payment.status === "SCHEDULED" ? "Pago programado correctamente" : "Pago enviado para aprobacion",
      paymentId,
    };
  }
}
