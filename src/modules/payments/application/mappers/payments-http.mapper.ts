import { CreateCreditQuotaInput } from "../dtos/credit-quota/input/create.input";
import { ListCreditQuotasInput } from "../dtos/credit-quota/input/list.input";
import { CreatePaymentInput } from "../dtos/payment/input/create.input";
import { ListPaymentsInput } from "../dtos/payment/input/list.input";

export class PaymentsHttpMapper {
  static toCreatePaymentInput(dto: CreatePaymentInput): CreatePaymentInput {
    return {
      ...dto,
      method: dto.method.trim(),
      operationNumber: dto.operationNumber?.trim() || undefined,
      note: dto.note?.trim() || undefined,
    };
  }

  static toListPaymentsInput(query: ListPaymentsInput): ListPaymentsInput {
    return query;
  }

  static toCreateCreditQuotaInput(dto: CreateCreditQuotaInput): CreateCreditQuotaInput {
    return dto;
  }

  static toListCreditQuotasInput(query: ListCreditQuotasInput): ListCreditQuotasInput {
    return query;
  }
}
