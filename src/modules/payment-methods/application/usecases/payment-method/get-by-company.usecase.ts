import { Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";
import { GetPaymentMethodsByCompanyInput } from "../../dtos/payment-method/input/get-by-company.input";
import { PaymentMethodWithNumber } from "src/modules/payment-methods/domain/ports/payment-method.repository";

export class GetPaymentMethodsByCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  private toOutput(item: PaymentMethodWithNumber): PaymentMethodOutput {
    return {
      methodId: item.method.methodId!,
      name: item.method.name,
      number: item.number ?? undefined,
      isActive: item.method.isActive,
    };
  }

  async execute(input: GetPaymentMethodsByCompanyInput) {
    const company = await this.companyRepo.findById(input.companyId);
    if (!company) {
      throw new NotFoundException(errorResponse("Empresa no encontrada"));
    }

    const methods = await this.paymentMethodRepo.getByCompany(input.companyId);
    return successResponse("Metodos de pago encontrados", methods.map((m) => this.toOutput(m)));
  }
}
