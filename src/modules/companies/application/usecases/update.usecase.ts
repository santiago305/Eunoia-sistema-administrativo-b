import { BadRequestException, ConflictException, Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CompanyEmail } from "src/modules/companies/domain/value-objects/company-email.vo";
import { UpdateCompanyInput } from "../dtos/company/input/update.input";
import { CompanyOutputMapper } from "../mappers/company-output.mapper";
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
          normalizedEmail = new CompanyEmail(input.email).value;
        } catch (error: unknown) {
          throw new BadRequestException(errorResponse("Email inválido"));

        }
      }

      if (normalizedEmail && normalizedEmail !== current.email) {
        const existsByEmail = await this.companyRepo.existsByEmail(normalizedEmail, tx);
        if (existsByEmail) {
          throw new ConflictException(errorResponse("Este email ya está registrado"));
        }
      }

      const nextCompany = current.update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.ruc !== undefined ? { ruc: input.ruc } : {}),
        ...(input.ubigeo !== undefined ? { ubigeo: input.ubigeo } : {}),
        ...(input.department !== undefined ? { department: input.department } : {}),
        ...(input.province !== undefined ? { province: input.province } : {}),
        ...(input.district !== undefined ? { district: input.district } : {}),
        ...(input.urbanization !== undefined ? { urbanization: input.urbanization } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.codLocal !== undefined ? { codLocal: input.codLocal } : {}),
        ...(input.solUser !== undefined ? { solUser: input.solUser } : {}),
        ...(input.solPass !== undefined ? { solPass: input.solPass } : {}),
        ...(input.production !== undefined ? { production: input.production } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.email !== undefined ? { email: normalizedEmail } : {}),
      });

      try {
        const updatedCompany = await this.companyRepo.update(
          {
            companyId: current.companyId!,
            ...(input.name !== undefined ? { name: nextCompany.name } : {}),
            ...(input.ruc !== undefined ? { ruc: nextCompany.ruc } : {}),
            ...(input.ubigeo !== undefined ? { ubigeo: nextCompany.ubigeo } : {}),
            ...(input.department !== undefined ? { department: nextCompany.department } : {}),
            ...(input.province !== undefined ? { province: nextCompany.province } : {}),
            ...(input.district !== undefined ? { district: nextCompany.district } : {}),
            ...(input.urbanization !== undefined
              ? { urbanization: nextCompany.urbanization }
              : {}),
            ...(input.address !== undefined ? { address: nextCompany.address } : {}),
            ...(input.phone !== undefined ? { phone: nextCompany.phone } : {}),
            ...(input.email !== undefined ? { email: nextCompany.email } : {}),
            ...(input.codLocal !== undefined ? { codLocal: nextCompany.codLocal } : {}),
            ...(input.solUser !== undefined ? { solUser: nextCompany.solUser } : {}),
            ...(input.solPass !== undefined ? { solPass: nextCompany.solPass } : {}),
            ...(input.production !== undefined ? { production: nextCompany.production } : {}),
            ...(input.isActive !== undefined ? { isActive: nextCompany.isActive } : {}),
            updatedAt: this.clock.now(),
          },
          tx,
        );

        if (!updatedCompany) {
          throw new NotFoundException(errorResponse("Empresa no encontrada"));
        }

        return successResponse(
          "Empresa actualizada correctamente",
          CompanyOutputMapper.toOutput(updatedCompany),
        );
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
          throw error;
        }
        throw new InternalServerErrorException(errorResponse("Error al actualizar datos de la empresa"));
      }
    });
  }
}
