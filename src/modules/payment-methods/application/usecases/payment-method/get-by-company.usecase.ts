import { Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { PaymentMethodOutput } from "../../dtos/payment-method/output/payment-method.output";
import { GetPaymentMethodsByCompanyInput } from "../../dtos/payment-method/input/get-by-company.input";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";

export class GetPaymentMethodsByCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}

  private toOutput(method: PaymentMethod): PaymentMethodOutput {
    return {
      methodId: method.methodId!,
      name: method.name,
      number: method.number,
      isActive: method.isActive,
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
