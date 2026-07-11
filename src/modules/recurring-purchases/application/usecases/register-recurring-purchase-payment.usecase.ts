import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { RecalculateAccountPayableUsecase } from "src/modules/accounts-payable";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { CreatePaymentInput } from "src/modules/payments/application/dtos/payment/input/create.input";
import { CreatePaymentUsecase } from "src/modules/payments/application/usecases/payment/create.usecase";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { GenerateCurrentPayableUsecase } from "./generate-current-payable.usecase";

type RegisterRecurringPaymentInput = {
  templateId: string;
  userId: string;
  payment: Omit<CreatePaymentInput, "poId" | "accountPayableId" | "paidByUserId">;
};

export class RegisterRecurringPurchasePaymentUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly templateRepo: RecurringPurchaseTemplateRepository,
    private readonly generateCurrentPayable: GenerateCurrentPayableUsecase,
    private readonly createPayment: CreatePaymentUsecase,
    private readonly recalculateAccountPayable: RecalculateAccountPayableUsecase,
    private readonly accessControlService: AccessControlService,
  ) {}

  async execute(input: RegisterRecurringPaymentInput) {
    const template = await this.templateRepo.findById(input.templateId);
    if (!template) throw new NotFoundException("Recurrencia no encontrada");

    let purchaseId = template.lastGeneratedPurchaseId;
    let accountPayableId = template.lastGeneratedAccountPayableId;

    if (!purchaseId || !accountPayableId || template.lastGeneratedPeriodKey !== template.currentPeriodKey()) {
      const generated = await this.generateCurrentPayable.execute({
        templateId: input.templateId,
        generatedByUserId: input.userId,
        now: template.nextDueDate,
      });
      if (!generated.generated || !generated.purchaseId || !generated.accountPayableId) {
        throw new BadRequestException("No se pudo generar la cuenta por pagar recurrente");
      }
      purchaseId = generated.purchaseId;
      accountPayableId = generated.accountPayableId;
    }

    const canApprovePayment = await this.accessControlService.userHasAllPermissions(input.userId, [
      "payments.approve",
    ]);
    const paidAt = input.payment.paidAt ?? input.payment.date;
    const result = await this.createPayment.execute(
      {
        ...input.payment,
        poId: purchaseId,
        accountPayableId,
        paidByUserId: input.userId,
        paidAt,
      },
      purchaseId,
      {
        status: canApprovePayment ? "APPROVED" : "PENDING_APPROVAL",
        requestedByUserId: input.userId,
        approvedByUserId: canApprovePayment ? input.userId : undefined,
        approvedAt: canApprovePayment ? new Date() : undefined,
      },
    );

    if (canApprovePayment) {
      await this.recalculateAccountPayable.execute({ accountPayableId });
    }

    return {
      ...result,
      purchaseId,
      accountPayableId,
    };
  }
}
