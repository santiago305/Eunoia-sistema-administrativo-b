import { CreateCompanyMethodInput } from "../dtos/company-method/input/create.input";
import { CreatePaymentMethodInput } from "../dtos/payment-method/input/create.input";
import { ListPaymentMethodsInput } from "../dtos/payment-method/input/list.input";
import { SetPaymentMethodActiveInput } from "../dtos/payment-method/input/set-active.input";
import { UpdatePaymentMethodInput } from "../dtos/payment-method/input/update.input";
import { CreateSupplierMethodInput } from "../dtos/supplier-method/input/create.input";

export class PaymentMethodHttpMapper {
  static toCreatePaymentMethodInput(dto: CreatePaymentMethodInput): CreatePaymentMethodInput {
    return {
      name: dto.name.trim(),
      isActive: dto.isActive,
    };
  }

  static toUpdatePaymentMethodInput(
    methodId: string,
    dto: Omit<UpdatePaymentMethodInput, "methodId">,
  ): UpdatePaymentMethodInput {
    return {
      methodId,
      name: dto.name?.trim(),
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
    return {
      ...dto,
      number: dto.number?.trim() || undefined,
    };
  }

  static toCreateSupplierMethodInput(dto: CreateSupplierMethodInput): CreateSupplierMethodInput {
    return {
      ...dto,
      number: dto.number?.trim() || undefined,
    };
  }
}
