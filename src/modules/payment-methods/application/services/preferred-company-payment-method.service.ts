import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from "src/modules/companies/domain/ports/company.repository";
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";

export type PreferredCompanyPaymentMethod = {
  companyId: string;
  paymentMethodId: string;
  method: string;
  code?: string;
};

@Injectable()
export class PreferredCompanyPaymentMethodService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  async resolve(
    tx?: TransactionContext,
  ): Promise<PreferredCompanyPaymentMethod> {
    const company = await this.companyRepo.findSingle(tx);
    if (!company?.companyId) {
      throw new BadRequestException("No existe una empresa configurada");
    }

    const configuredMethods = await this.paymentMethodRepo.getByCompany(
      company.companyId,
      tx,
    );
    const configured =
      configuredMethods.find((item) => item.isDefault) ??
      configuredMethods.find((item) => item.method.code === "BANK_TRANSFER");

    if (!configured?.method.methodId) {
      throw new BadRequestException(
        "La empresa no tiene un método de pago preferido disponible",
      );
    }

    return {
      companyId: company.companyId,
      paymentMethodId: configured.method.methodId,
      method: configured.method.name,
      code: configured.method.code,
    };
  }
}
