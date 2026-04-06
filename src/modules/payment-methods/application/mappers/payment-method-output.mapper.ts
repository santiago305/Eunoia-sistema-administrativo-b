import { PaymentMethodOutput } from "../dtos/payment-method/output/payment-method.output";
import { PaymentMethod } from "../../domain/entity/payment-method";
import { PaymentMethodWithNumber } from "../../domain/ports/payment-method.repository";

export class PaymentMethodOutputMapper {
  static toOutput(method: PaymentMethod): PaymentMethodOutput {
    return {
      methodId: method.methodId!,
      name: method.name,
      isActive: method.isActive,
    };
  }

  static toOutputWithNumber(item: PaymentMethodWithNumber): PaymentMethodOutput {
    return {
      methodId: item.method.methodId!,
      name: item.method.name,
      number: item.number ?? undefined,
      isActive: item.method.isActive,
    };
  }
}
