import { CreateCompanyMethodInput } from "../dtos/company-method/input/create.input";
import { UpdateCompanyMethodInput } from "../dtos/company-method/input/update.input";
import { CreatePaymentMethodInput } from "../dtos/payment-method/input/create.input";
import { ListPaymentMethodsInput } from "../dtos/payment-method/input/list.input";
import { SetPaymentMethodActiveInput } from "../dtos/payment-method/input/set-active.input";
import { UpdatePaymentMethodInput } from "../dtos/payment-method/input/update.input";
import { CreateSupplierMethodInput } from "../dtos/supplier-method/input/create.input";
import { UpdateSupplierMethodInput } from "../dtos/supplier-method/input/update.input";

export class PaymentMethodHttpMapper {
  private static normalizeNumber(number?: string | null) {
    if (number === undefined || number === null) return null;

    const normalized = number.trim();
    return normalized ? normalized : null;
  }

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
      number: PaymentMethodHttpMapper.normalizeNumber(dto.number),
    };
  }

  static toCreateSupplierMethodInput(dto: CreateSupplierMethodInput): CreateSupplierMethodInput {
    return {
      ...dto,
      number: PaymentMethodHttpMapper.normalizeNumber(dto.number),
    };
  }

  static toUpdateSupplierMethodInput(
    supplierMethodId: string,
    dto: Omit<UpdateSupplierMethodInput, "supplierMethodId">,
  ): UpdateSupplierMethodInput {
    const input: UpdateSupplierMethodInput = { supplierMethodId };

    if (dto.methodId !== undefined) input.methodId = dto.methodId;
    if (Object.prototype.hasOwnProperty.call(dto, "number")) {
      input.number = PaymentMethodHttpMapper.normalizeNumber(dto.number);
    }

    return input;
  }

  static toUpdateCompanyMethodInput(
    companyMethodId: string,
    dto: Omit<UpdateCompanyMethodInput, "companyMethodId">,
  ): UpdateCompanyMethodInput {
    const input: UpdateCompanyMethodInput = { companyMethodId };

    if (dto.methodId !== undefined) input.methodId = dto.methodId;
    if (Object.prototype.hasOwnProperty.call(dto, "number")) {
      input.number = PaymentMethodHttpMapper.normalizeNumber(dto.number);
    }

    return input;
  }
}
