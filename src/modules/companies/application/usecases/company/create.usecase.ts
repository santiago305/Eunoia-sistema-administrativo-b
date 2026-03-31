import { BadRequestException, ConflictException, Inject, InternalServerErrorException } from "@nestjs/common";
import { Email } from "src/modules/users/domain";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { Company } from "src/modules/companies/domain/entity/company";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CreateCompanyInput } from "../../dtos/company/input/create.input";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";

export class CreateCompanyUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
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
          normalizedEmail = new Email(input.email).value;
        } catch (error) {
          throw new BadRequestException(errorResponse("Email inválido"));
        }
      }

      if (normalizedEmail) {
        const existsByEmail = await this.companyRepo.existsByEmail(normalizedEmail, tx);
        if (existsByEmail) {
          throw new ConflictException(errorResponse("Este email ya está registrado"));
        }
      }

      const now = this.clock.now();
      const company = new Company(
        undefined,
        input.name,
        input.ruc,
        input.ubigeo,
        input.department,
        input.province,
        input.district,
        input.urbanization,
        input.address,
        input.phone,
        normalizedEmail,
        input.codLocal,
        input.solUser,
        input.solPass,
        undefined,
        undefined,
        input.production ?? true,
        input.isActive ?? true,
        now,
        now,
      );

      try {
        await this.companyRepo.create(company, tx);
      } catch (error) {
        throw new InternalServerErrorException(errorResponse(error))
      }
      return successResponse("Empresa creada correctamente");
    });
  }
}
