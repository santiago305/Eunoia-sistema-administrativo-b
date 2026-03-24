import { BadRequestException, ConflictException, Inject, InternalServerErrorException } from "@nestjs/common";
import { CompanyEmail } from "src/modules/companies/domain/value-objects/company-email.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CompanyFactory } from "src/modules/companies/domain/factories/company.factory";
import { CreateCompanyInput } from "../dtos/company/input/create.input";
import { CompanyOutputMapper } from "../mappers/company-output.mapper";

export class CreateCompanyUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
  ) {}

  async execute(input: CreateCompanyInput) {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.companyRepo.findSingle(tx);
      if (existing) {
        throw new ConflictException(errorResponse("La empresa ya existe"));
      }

      let normalizedEmail: string | undefined;
      if (input.email) {
        try {
          normalizedEmail = new CompanyEmail(input.email).value;
        } catch (error: unknown) {
          throw new BadRequestException(errorResponse("Email inválido"));
        }
      }

      if (normalizedEmail) {
        const existsByEmail = await this.companyRepo.existsByEmail(normalizedEmail, tx);
        if (existsByEmail) {
          throw new ConflictException(errorResponse("Este email ya está registrado"));
        }
      }

      const company = CompanyFactory.create({
        ...input,
        email: normalizedEmail,
      });

      try {
        const createdCompany = await this.companyRepo.create(company, tx);

        return successResponse(
          "Empresa creada correctamente",
          CompanyOutputMapper.toOutput(createdCompany),
        );
      } catch {
        throw new InternalServerErrorException(
          errorResponse("No se pudo crear la empresa"),
        );
      }
    });
  }
}
