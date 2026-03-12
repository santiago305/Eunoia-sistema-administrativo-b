import { Inject } from "@nestjs/common";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";

export class GetPaymentMethodsRecordsUsecase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  async execute(): Promise<PaymentMethodOutput[]> {
    const rows = await this.paymentMethodRepo.getRecords();
    return rows.map((m) => ({
      methodId: m.methodId!,
      name: m.name,
      number: m.number,
      isActive: m.isActive,
    }));
  }
}
