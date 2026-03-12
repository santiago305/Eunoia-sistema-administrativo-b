import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { CompanyMethod } from "src/modules/payment-methods/domain/entity/company-method";
import { CreateCompanyMethodInput } from "../../dtos/company-method/input/create.input";

export class CreateCompanyMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
    @Inject(COMPANY_METHOD_REPOSITORY)
    private readonly companyMethodRepo: CompanyMethodRepository,
  ) {}

  async execute(input: CreateCompanyMethodInput) {
    return this.uow.runInTransaction(async (tx) => {
      const company = await this.companyRepo.findById(input.companyId, tx);
      if (!company) {
        throw new NotFoundException(errorResponse("Empresa no encontrada"));
      }

      const method = await this.paymentMethodRepo.findById(input.methodId, tx);
      if (!method) {
        throw new NotFoundException(errorResponse("Metodo de pago no encontrado"));
      }

      const existing = await this.companyMethodRepo.findById(input.companyId, input.methodId, tx);
      if (existing) {
        throw new ConflictException(errorResponse("La relacion ya existe"));
      }

      const relation = new CompanyMethod(input.companyId, input.methodId);
      try {
        await this.companyMethodRepo.create(relation, tx);
        return successResponse("Relacion creada correctamente", {
          companyId: input.companyId,
          methodId: input.methodId,
        });
      } catch {
        throw new BadRequestException(errorResponse("No se pudo crear la relacion"));
      }
    });
  }
}
