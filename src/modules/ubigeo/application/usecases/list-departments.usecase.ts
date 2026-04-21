import { Inject } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "../../domain/ports/ubigeo.repository";
import { UbigeoOutputMapper } from "../mappers/ubigeo-output.mapper";

export class ListDepartmentsUsecase {
  constructor(
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}

  async execute() {
    const departments = await this.ubigeoRepository.listDepartments();

    return successResponse(
      "Departamentos obtenidos correctamente",
      departments.map((department) => UbigeoOutputMapper.toDepartmentOutput(department)),
    );
  }
}
