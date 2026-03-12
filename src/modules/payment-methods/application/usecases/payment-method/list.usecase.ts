import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { ListPaymentMethodsInput } from "../../dtos/payment-method/input/list.input";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";

export class ListPaymentMethodsUsecase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  async execute(input: ListPaymentMethodsInput): Promise<PaginatedResult<PaymentMethodOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.paymentMethodRepo.list({
      name: input.name,
      isActive: input.isActive,
      page,
      limit,
    });

    return {
      items: items.map((m) => ({
        methodId: m.methodId!,
        name: m.name,
        number: undefined,
        isActive: m.isActive,
      })),
      total,
      page,
      limit,
    };
  }
}
