import { Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { successResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { GetPaymentMethodsByCompanyInput } from "../../dtos/payment-method/input/get-by-company.input";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

export class GetPaymentMethodsByCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
  ) {}
  async execute(input: GetPaymentMethodsByCompanyInput) {
    const company = await this.companyRepo.findById(input.companyId);
    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    const methods = await this.paymentMethodRepo.getByCompany(input.companyId);
    return successResponse(
      "Metodos de pago encontrados",
      methods.map((method) => PaymentMethodOutputMapper.toOutputWithNumber(method)),
    );
  }
}
