import { BadRequestException, Inject, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CreatePaymentInput } from "../../dtos/payment/input/create.input";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";
import { CreditQuotaNotFoundError } from "../../errors/credit-quota-not-found.error";
import { successResponse } from "src/shared/response-standard/response";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import { RecalculateAccountPayableUsecase } from "src/modules/accounts-payable";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { ACCOUNT_PAYABLE_REPOSITORY, AccountPayableRepository } from "src/modules/accounts-payable";
import { PaymentAllocationEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-allocation.entity";
import { SupplierPaymentDestinationEntity } from "src/modules/supplier-payment-destinations/adapters/out/persistence/typeorm/entities/supplier-payment-destination.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import {
  PaymentFinancialPolicy,
  type PaymentMethodPolicy,
} from "src/modules/payments/domain/services/payment-financial-policy";
import { getPaymentMethodDefinition } from "src/modules/payment-methods/domain/value-objects/payment-method-catalog";

export class CreatePaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    private readonly recalculateAccountPayable: RecalculateAccountPayableUsecase,
    @Optional()
    private readonly history?: PurchaseHistoryService,
    @Optional()
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly companyPaymentAccounts?: Repository<CompanyPaymentAccountEntity>,
    @Optional()
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethods?: Repository<PaymentMethodEntity>,
    @Optional()
    @InjectRepository(SupplierPaymentDestinationEntity)
    private readonly supplierPaymentDestinations?: Repository<SupplierPaymentDestinationEntity>,
    @Optional()
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrders?: Repository<PurchaseOrderEntity>,
    @Optional()
    @Inject(ACCOUNT_PAYABLE_REPOSITORY)
    private readonly payableRepo?: AccountPayableRepository,
    @Optional()
    @InjectRepository(PaymentAllocationEntity)
    private readonly allocationRepo?: Repository<PaymentAllocationEntity>,
  ) {}

  private async validateTreasuryAccount(input: CreatePaymentInput) {
    if (!this.companyPaymentAccounts) return;
    const account = input.companyPaymentAccountId
      ? await this.companyPaymentAccounts.findOne({ where: { id: input.companyPaymentAccountId } })
      : null;
    const method = input.paymentMethodId && this.paymentMethods
      ? await this.paymentMethods.findOne({ where: { id: input.paymentMethodId } })
      : null;
    const methodCode = method?.code ?? getPaymentMethodDefinition(undefined, input.method).code;
    const definition = getPaymentMethodDefinition(methodCode, input.method);
    const methodPolicy: PaymentMethodPolicy = method
      ? {
          code: method.code,
          isActive: method.isActive,
          requiresSourceAccount: method.requiresSourceAccount,
          // Destination is validated after it is resolved and checked against the supplier.
          requiresDestination: false,
          requiresOperationReference: false,
          requiresVoucher: method.requiresVoucher,
        }
      : {
          ...definition,
          isActive: true,
          // Legacy callers are kept compatible until their adapters migrate.
          requiresSourceAccount: true,
          requiresDestination: false,
          requiresOperationReference: false,
        };

    try {
      PaymentFinancialPolicy.validate({
        method: methodPolicy,
        account: account
          ? {
              id: account.id,
              isActive: account.isActive,
              currency: account.currency,
              usage: account.usage,
              type: account.type,
            }
          : null,
        currency: input.currency,
      });
    } catch (error) {
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private async validateSupplierDestination(input: CreatePaymentInput, purchaseId: string) {
    const method = input.paymentMethodId && this.paymentMethods
      ? await this.paymentMethods.findOne({ where: { id: input.paymentMethodId } })
      : null;
    if (input.paymentMethodId && (!method || !method.isActive)) {
      throw new BadRequestException("El metodo de pago no esta disponible");
    }

    if (method?.requiresDestination && !input.supplierPaymentDestinationId) {
      throw new BadRequestException("Debe seleccionar el destino de pago del proveedor");
    }
    if (!input.supplierPaymentDestinationId) return;
    if (!this.supplierPaymentDestinations || !this.purchaseOrders) {
      throw new BadRequestException("No se pudo validar el destino del proveedor");
    }

    const [destination, purchase] = await Promise.all([
      this.supplierPaymentDestinations.findOne({ where: { id: input.supplierPaymentDestinationId } }),
      this.purchaseOrders.findOne({ where: { id: purchaseId }, select: ["id", "supplierId"] }),
    ]);
    if (!destination || !destination.isActive || destination.requiresManualReview) {
      throw new BadRequestException("El destino de pago no esta disponible para uso inmediato");
    }
    if (!purchase || destination.supplierId !== purchase.supplierId) {
      throw new BadRequestException("El destino seleccionado no pertenece al proveedor de la compra");
    }

    const definition = getPaymentMethodDefinition(method?.code, input.method);
    try {
      PaymentFinancialPolicy.validate({
        method: method
          ? {
              code: method.code,
              isActive: method.isActive,
              requiresSourceAccount: false,
              requiresDestination: Boolean(method.requiresDestination),
              requiresOperationReference: method.requiresOperationReference,
              requiresVoucher: method.requiresVoucher,
            }
          : {
              ...definition,
              isActive: true,
              requiresSourceAccount: false,
            },
        destination: {
          id: destination.id,
          isActive: destination.isActive,
          requiresManualReview: destination.requiresManualReview,
          currency: destination.currency,
          methodId: destination.methodId,
        },
        paymentMethodId: input.paymentMethodId,
        currency: input.currency,
        operationNumber: input.operationNumber,
      });
    } catch (error) {
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private async validateMethodRequirements(input: CreatePaymentInput) {
    if (!this.paymentMethods || !input.paymentMethodId) return;
    const method = await this.paymentMethods.findOne({ where: { id: input.paymentMethodId } });
    if (!method) throw new BadRequestException("El metodo de pago no existe");
    try {
      PaymentFinancialPolicy.validate({
        method: {
          code: method.code,
          isActive: method.isActive,
          // Source account and destination are validated by their respective adapters.
          requiresSourceAccount: false,
          requiresDestination: false,
          requiresOperationReference: method.requiresOperationReference,
          requiresVoucher: method.requiresVoucher,
        },
        currency: input.currency,
        operationNumber: input.operationNumber,
      });
    } catch (error) {
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }
  }

  async execute(
    input: CreatePaymentInput,
    poId?: string,
    options?: {
      status?: "DRAFT" | "SCHEDULED" | "PENDING_APPROVAL" | "POSTED" | "APPROVED";
      requestedByUserId?: string;
      approvedByUserId?: string;
      approvedAt?: Date;
      scheduledByUserId?: string;
    },
  ): Promise<{ message: string; paymentId?: string }> {
    return this.uow.runInTransaction(async (tx) => {
      let quotaToUpdate: { quotaId: string; totalPaid: number } | null = null;
      const paymentPoId = poId ?? input.poId;
      if (!paymentPoId) {
        throw new BadRequestException("Debe indicar la orden de compra");
      }

      if (input.amount <= 0) {
        throw new BadRequestException("Monto invalido");
      }

      const date = new Date(input.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Fecha invalida");
      }
      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
      if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException("Fecha programada invalida");
      }
      const paidAt = input.paidAt ? new Date(input.paidAt) : undefined;
      if (paidAt && Number.isNaN(paidAt.getTime())) {
        throw new BadRequestException("Fecha de pago invalida");
      }

      await this.validateTreasuryAccount(input);
      await this.validateSupplierDestination(input, paymentPoId);
      await this.validateMethodRequirements(input);
      if (["POSTED", "APPROVED"].includes(options?.status ?? "APPROVED") && input.paymentMethodId && this.paymentMethods) {
        const method = await this.paymentMethods.findOne({ where: { id: input.paymentMethodId } });
        if (method?.requiresVoucher && !input.paymentEvidenceFileId) {
          throw new BadRequestException("Los pagos que requieren comprobante deben enviarse como borrador con evidencia");
        }
      }

      let accountPayableId = input.accountPayableId;
      if (!accountPayableId && this.payableRepo) {
        const payable = await this.payableRepo.findByPurchaseAndQuota(paymentPoId, input.quotaId, tx);
        accountPayableId = payable?.accountPayableId;
      }

      if (accountPayableId && ["APPROVED", "POSTED"].includes(options?.status ?? "APPROVED") && this.payableRepo) {
        const payable = await this.payableRepo.findById(accountPayableId, tx);
        if (!payable) throw new BadRequestException("La cuenta por pagar indicada no existe");
        const approvedPayments = await this.paymentDocRepo.findApprovedByAccountPayableId(accountPayableId, tx);
        const alreadyPaid = approvedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        if (alreadyPaid + input.amount > payable.amountTotal + 0.01) {
          throw new BadRequestException("El pago supera el saldo pendiente de la cuenta por pagar");
        }
      }

      if (input.quotaId) {
        const quota = await this.creditQuotaRepo.findById(input.quotaId, tx);
        if (!quota) {
          throw new NotFoundException(new CreditQuotaNotFoundError().message);
        }
        quotaToUpdate = { quotaId: quota.quotaId, totalPaid: quota.totalPaid };

        const porderId = paymentPoId;
        if (!quota.poId) {
          throw new BadRequestException("La cuota no tiene orden de compra asociada");
        }
        if (porderId && quota.poId !== porderId) {
          throw new BadRequestException("La cuota no pertenece a la orden de compra indicada");
        }
      }

      const document = PaymentsFactory.createPaymentDocument({
        method: input.method,
        date,
        currency: input.currency,
        amount: input.amount,
        fromDocumentType: PayDocType.PURCHASE,
        operationNumber: input.operationNumber,
        note: input.note,
        poId: paymentPoId,
        quotaId: input.quotaId,
        accountPayableId,
        companyPaymentAccountId: input.companyPaymentAccountId,
        paymentMethodId: input.paymentMethodId,
        supplierPaymentDestinationId: input.supplierPaymentDestinationId,
        status: options?.status ?? "APPROVED",
        requestedByUserId: options?.requestedByUserId,
        approvedByUserId: options?.approvedByUserId,
        approvedAt: options?.approvedAt,
        paidByUserId: input.paidByUserId,
        scheduledByUserId: input.scheduledByUserId ?? options?.scheduledByUserId,
        scheduledAt,
        paidAt,
        paymentEvidenceFileId: input.paymentEvidenceFileId,
        bankName: input.bankName,
        cardLastFour: input.cardLastFour,
        operationCode: input.operationCode,
        isPartial: input.isPartial,
      });

      let createdPaymentId: string | undefined;
      try {
        const created = await this.paymentDocRepo.create(document, tx);
        createdPaymentId = created.payDocId;
        if (accountPayableId && ["APPROVED", "POSTED"].includes(options?.status ?? "APPROVED") && this.allocationRepo) {
          const allocationRepository = (tx as any)?.manager?.getRepository(PaymentAllocationEntity) ?? this.allocationRepo;
          if (allocationRepository) await allocationRepository.save(allocationRepository.create({
            paymentId: created.payDocId,
            accountPayableId,
            amount: input.amount,
            currency: input.currency,
          }));
        }
        const status = options?.status ?? "APPROVED";
        if (status === "APPROVED" || status === "SCHEDULED") {
          await this.history?.recordPayment({
            purchaseId: paymentPoId,
            eventType: status === "SCHEDULED" ? "PAYMENT_SCHEDULED" : "PAYMENT_REGISTERED",
            description: status === "SCHEDULED"
              ? "Se programó un pago de la compra."
              : "Se registró un pago de la compra.",
            performedByUserId: options?.scheduledByUserId ?? options?.approvedByUserId ?? options?.requestedByUserId ?? input.paidByUserId ?? null,
            metadata: {
              paymentId: created.payDocId,
              amount: input.amount,
              currency: input.currency,
              method: input.method,
              operationNumber: input.operationNumber ?? null,
              quotaId: input.quotaId ?? null,
              accountPayableId: accountPayableId ?? null,
              companyPaymentAccountId: input.companyPaymentAccountId ?? null,
              paymentMethodId: input.paymentMethodId ?? null,
              supplierPaymentDestinationId: input.supplierPaymentDestinationId ?? null,
              scheduledAt: scheduledAt ?? null,
              paidAt: paidAt ?? null,
              status,
              isPartial: input.isPartial ?? false,
            },
            tx,
          });
        }
      } catch {
        throw new BadRequestException("No se pudo crear el documento de pago");
      }

      try {
        if (quotaToUpdate && ["APPROVED", "POSTED"].includes(options?.status ?? "APPROVED")) {
          const newTotalPaid = quotaToUpdate.totalPaid + input.amount;
          await this.creditQuotaRepo.updateTotalPaid(quotaToUpdate.quotaId, newTotalPaid, tx);
          await this.creditQuotaRepo.updatePaymentDate(quotaToUpdate.quotaId, date, tx);
        }
        if (accountPayableId && ["APPROVED", "POSTED"].includes(options?.status ?? "APPROVED")) {
          await this.recalculateAccountPayable.execute({ accountPayableId }, tx);
        }
      } catch {
        throw new BadRequestException("No se pudo vincular el pago a la orden de compra");
      }

      return {
        ...successResponse("Pago registrado con exito"),
        paymentId: createdPaymentId,
      };
    });
  }
}
