import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { GetCompanyMethodByIdInput } from "../../dtos/company-method/input/get-by-id.input";
import { PaymentMethodRelationNotFoundError } from "../../errors/payment-method-relation-not-found.error";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

export class GetCompanyMethodByIdUsecase {
  constructor(
    @Inject(COMPANY_METHOD_REPOSITORY)
    private readonly companyMethodRepo: CompanyMethodRepository,
  ) {}

  async execute(input: GetCompanyMethodByIdInput) {
    const existing = await this.companyMethodRepo.findDetailById(input.companyMethodId);
    if (!existing) {
      throw new NotFoundException(new PaymentMethodRelationNotFoundError().message);
    }

    return successResponse("Relacion encontrada", PaymentMethodOutputMapper.toCompanyMethodOutput(existing));
  }
}
