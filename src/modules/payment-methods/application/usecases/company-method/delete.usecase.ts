import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { GetCompanyMethodByIdInput } from "../../dtos/company-method/input/get-by-id.input";
import { PaymentMethodRelationNotFoundError } from "../../errors/payment-method-relation-not-found.error";

export class DeleteCompanyMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_METHOD_REPOSITORY)
    private readonly companyMethodRepo: CompanyMethodRepository,
  ) {}

  async execute(input: GetCompanyMethodByIdInput) {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.companyMethodRepo.findById(input.companyId, input.methodId, tx);
      if (!existing) {
        throw new NotFoundException(new PaymentMethodRelationNotFoundError().message);
      }

      try {
        const deleted = await this.companyMethodRepo.delete(input.companyId, input.methodId, tx);
        if (!deleted) {
          throw new BadRequestException("No se pudo eliminar la relacion");
        }
        return successResponse("Relacion eliminada correctamente", {
          companyId: input.companyId,
          methodId: input.methodId,
        });
      } catch {
        throw new BadRequestException("No se pudo eliminar la relacion");
      }
    });
  }
}
