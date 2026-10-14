import { BadRequestException, ConflictException, Inject, InternalServerErrorException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CompanyFactory } from "src/modules/companies/domain/factories/company.factory";
import { CompanyEmail } from "src/modules/companies/domain/value-objects/company-email.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { CreateCompanyInput } from "../dtos/company/input/create.input";
import { CompanyOutputMapper } from "../mappers/company-output.mapper";
import { USER_REPOSITORY, UserRepository } from "src/modules/users/application/ports/user.repository";

export class CreateCompanyUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateCompanyInput, requesterUserId: string) {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.companyRepo.findSingle(tx);
      if (existing) {
        throw new ConflictException("La empresa ya existe");
      }

      let normalizedEmail: string | undefined;
      if (input.email) {
        try {
          normalizedEmail = new CompanyEmail(input.email).value;
        } catch {
          throw new BadRequestException("Email invalido");
        }
      }

      if (normalizedEmail) {
        const existsByEmail = await this.companyRepo.existsByEmail(normalizedEmail, tx);
        if (existsByEmail) {
          throw new ConflictException("Este email ya esta registrado");
        }
      }

      const company = CompanyFactory.create({
        ...input,
        email: normalizedEmail,
      });

      try {
        const createdCompany = await this.companyRepo.create(company, tx);
        if (!createdCompany.companyId) {
          throw new InternalServerErrorException("La empresa creada no tiene un identificador válido");
        }
        await this.userRepository.assignCompany(requesterUserId, createdCompany.companyId, tx);
        return successResponse(
          "Empresa creada correctamente",
          CompanyOutputMapper.toOutput(createdCompany),
        );
      } catch {
        throw new InternalServerErrorException("No se pudo crear la empresa");
      }
    });
  }
}
