import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { GetCompanyMethodByIdInput } from "../../dtos/company-method/input/get-by-id.input";

export class GetCompanyMethodByIdUsecase {
  constructor(
    @Inject(COMPANY_METHOD_REPOSITORY)
    private readonly companyMethodRepo: CompanyMethodRepository,
  ) {}

  async execute(input: GetCompanyMethodByIdInput) {
    const existing = await this.companyMethodRepo.findById(input.companyId, input.methodId);
    if (!existing) {
      throw new NotFoundException(errorResponse("Relacion no encontrada"));
    }

    return successResponse("Relacion encontrada", {
      companyId: existing.companyId,
      methodId: existing.methodId,
    });
  }
}
