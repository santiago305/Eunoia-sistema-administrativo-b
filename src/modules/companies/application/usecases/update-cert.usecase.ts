import { Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";
import { successResponse } from "src/shared/response-standard/response";
import { CompanyNotFoundApplicationError } from "../errors/company-not-found.error";

export class UpdateCompanyCertUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(filePath: string) {
    const current = await this.companyRepo.findSingle();
    if (!current) {
      throw new NotFoundException(new CompanyNotFoundApplicationError().message);
    }

    const saved = await this.companyRepo.update({
      companyId: current.companyId!,
      certPath: filePath,
      updatedAt: this.clock.now(),
    });

    if (!saved) {
      throw new InternalServerErrorException("No se pudo actualizar el certificado");
    }

    return successResponse("Certificado actualizado correctamente", {
      companyId: saved.companyId,
      certPath: saved.certPath,
    });
  }
}
