import { BadRequestException, ConflictException, Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Email } from "src/modules/users/domain";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { UpdateCompanyInput } from "../../dtos/company/input/update.input";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";

export class UpdateCompanyUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateCompanyInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.companyRepo.findSingle(tx);
      if (!current) {
        throw new NotFoundException(errorResponse("Empresa no encontrada"));
      }

      let normalizedEmail: string | undefined;
      if (input.email !== undefined) {
        try {
          normalizedEmail = new Email(input.email).value;
        } catch (error) {
          throw new BadRequestException(errorResponse("Email inválido"));

        }
      }

      if (normalizedEmail && normalizedEmail !== current.email) {
        const existsByEmail = await this.companyRepo.existsByEmail(normalizedEmail, tx);
        if (existsByEmail) {
          throw new ConflictException(errorResponse("Este email ya está registrado"));
        }
      }

      try {
        await this.companyRepo.update(
          {
            companyId: current.companyId!,
            name: input.name,
            ruc: input.ruc,
            ubigeo: input.ubigeo,
            department: input.department,
            province: input.province,
            district: input.district,
            urbanization: input.urbanization,
            address: input.address,
            phone: input.phone,
            email: normalizedEmail,
            codLocal: input.codLocal,
            solUser: input.solUser,
            solPass: input.solPass,
            production: input.production,
            isActive: input.isActive,
            updatedAt: this.clock.now(),
          },
          tx,
        );
      } catch (error) {
        throw new InternalServerErrorException(errorResponse("Error al actualizar datos de la empresa"));
      }

      return successResponse("Empresa actualizada correctamente");
    });
  }
}
