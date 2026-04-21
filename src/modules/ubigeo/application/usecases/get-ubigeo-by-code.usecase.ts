import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "../../domain/ports/ubigeo.repository";
import { UbigeoOutputMapper } from "../mappers/ubigeo-output.mapper";

export class GetUbigeoByCodeUsecase {
  constructor(
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}

  async execute(code: string) {
    const normalizedCode = code?.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new BadRequestException("El codigo UBIGEO debe tener 6 digitos");
    }

    const record = await this.ubigeoRepository.findByDistrictCode(normalizedCode);
    if (!record) {
      throw new NotFoundException("No existe UBIGEO para el codigo enviado");
    }

    return successResponse(
      "UBIGEO obtenido correctamente",
      UbigeoOutputMapper.toByCodeOutput(record),
    );
  }
}
