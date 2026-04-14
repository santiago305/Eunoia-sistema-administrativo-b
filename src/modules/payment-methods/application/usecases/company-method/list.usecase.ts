import { Inject, NotFoundException } from "@nestjs/common";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";
import { ListCompanyMethodsInput } from "../../dtos/company-method/input/list.input";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { successResponse } from "src/shared/response-standard/response";

export class ListCompanyMethodsUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(COMPANY_METHOD_REPOSITORY)
    private readonly companyMethodRepo: CompanyMethodRepository,
  ) {}

  async execute(input: ListCompanyMethodsInput) {
    const company = await this.companyRepo.findById(input.companyId);
    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    const rows = await this.companyMethodRepo.listByCompany(input.companyId);
    return successResponse(
      "Relaciones encontradas",
      rows.map((row) => PaymentMethodOutputMapper.toCompanyMethodOutput(row)),
    );
  }
}
