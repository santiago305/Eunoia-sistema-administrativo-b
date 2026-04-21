import { Inject } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "../../domain/ports/ubigeo.repository";
import { UbigeoOutputMapper } from "../mappers/ubigeo-output.mapper";

export class GetUbigeoCatalogUsecase {
  constructor(
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}

  async execute() {
    const catalog = await this.ubigeoRepository.getCatalog();

    return successResponse(
      "Catalogo UBIGEO obtenido correctamente",
      UbigeoOutputMapper.toCatalogOutput(catalog),
    );
  }
}
