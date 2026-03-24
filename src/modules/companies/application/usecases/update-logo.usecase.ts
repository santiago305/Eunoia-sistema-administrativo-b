import {
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";

export class UpdateCompanyLogoUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(filePath: string) {
    const current = await this.companyRepo.findSingle();
    if (!current) throw new NotFoundException(errorResponse("Empresa no encontrada"));

    const saved = await this.companyRepo.update({
      companyId: current.companyId!,
      logoPath: filePath,
      updatedAt: this.clock.now(),
    });

    if (!saved) {
      throw new InternalServerErrorException(errorResponse("No se pudo actualizar el logo"));
    }

    return successResponse("Logo actualizado correctamente", {
      companyId: saved.companyId,
      logoPath: saved.logoPath,
    });
  }
}
