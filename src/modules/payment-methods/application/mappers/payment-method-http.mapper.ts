import { CreateCompanyMethodInput } from "../dtos/company-method/input/create.input";
import { UpdateCompanyMethodInput } from "../dtos/company-method/input/update.input";
import { CreatePaymentMethodInput } from "../dtos/payment-method/input/create.input";
import { ListPaymentMethodsInput } from "../dtos/payment-method/input/list.input";
import { SetPaymentMethodActiveInput } from "../dtos/payment-method/input/set-active.input";
import { UpdatePaymentMethodInput } from "../dtos/payment-method/input/update.input";

export class PaymentMethodHttpMapper {
  static toCreatePaymentMethodInput(dto: CreatePaymentMethodInput): CreatePaymentMethodInput {
    return {
      name: dto.name.trim(),
      code: dto.code?.trim() || undefined,
      isActive: dto.isActive,
      requiresVoucher: dto.requiresVoucher,
    };
  }

  static toUpdatePaymentMethodInput(
    methodId: string,
    dto: Omit<UpdatePaymentMethodInput, "methodId">,
  ): UpdatePaymentMethodInput {
    return {
      methodId,
      name: dto.name?.trim(),
      requiresVoucher: dto.requiresVoucher,
    };
  }

  static toSetActiveInput(methodId: string, isActive: boolean): SetPaymentMethodActiveInput {
    return { methodId, isActive };
  }

  static toListInput(query: ListPaymentMethodsInput): ListPaymentMethodsInput {
    return {
      ...query,
      name: query.name?.trim() || undefined,
    };
  }

  static toCreateCompanyMethodInput(dto: CreateCompanyMethodInput): CreateCompanyMethodInput {
    return { ...dto };
  }

  static toUpdateCompanyMethodInput(
    companyMethodId: string,
    dto: Omit<UpdateCompanyMethodInput, "companyMethodId">,
  ): UpdateCompanyMethodInput {
    const input: UpdateCompanyMethodInput = { companyMethodId };

    if (dto.methodId !== undefined) input.methodId = dto.methodId;
    if (dto.requiresVoucher !== undefined) input.requiresVoucher = dto.requiresVoucher;
    if (dto.evidencePolicy !== undefined) input.evidencePolicy = dto.evidencePolicy;
    if (dto.enabled !== undefined) input.enabled = dto.enabled;

    return input;
  }
}
