import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { CreateCompanyMethodInput } from "../../dtos/company-method/input/create.input";
import { PaymentMethodFactory } from "src/modules/payment-methods/domain/factories/payment-method.factory";
import { PaymentMethodNotFoundError } from "../../errors/payment-method-not-found.error";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

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
        throw new NotFoundException("Empresa no encontrada");
      }

      const method = await this.paymentMethodRepo.findById(input.methodId, tx);
      if (!method) {
        throw new NotFoundException(new PaymentMethodNotFoundError().message);
      }

      const relation = PaymentMethodFactory.createCompanyMethod(input);
      const existing = await this.companyMethodRepo.findDuplicate(
        relation.companyId,
        relation.methodId,
        relation.number ?? null,
        tx,
      );
      if (existing) {
        throw new ConflictException("La relacion ya existe");
      }

      try {
        const saved = await this.companyMethodRepo.create(relation, tx);
        return successResponse("Relacion creada correctamente", PaymentMethodOutputMapper.toCompanyMethodOutput({
          relation: saved,
          method,
        }));
      } catch (error: any) {
        if (error?.code === "23505") {
          throw new ConflictException("La relacion ya existe");
        }
        throw new BadRequestException("No se pudo crear la relacion");
      }
    });
  }
}
