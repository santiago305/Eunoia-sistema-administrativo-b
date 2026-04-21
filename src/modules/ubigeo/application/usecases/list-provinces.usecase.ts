import { BadRequestException, Inject } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "../../domain/ports/ubigeo.repository";
import { normalizeUbigeoName } from "../../shared/utils/normalize-ubigeo-name.util";
import { ListUbigeoProvincesInput } from "../dtos/ubigeo.input";
import { UbigeoOutputMapper } from "../mappers/ubigeo-output.mapper";

export class ListProvincesUsecase {
  constructor(
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}

  async execute(input: ListUbigeoProvincesInput) {
    const departmentIds = await this.resolveDepartmentIds(input);
    const provinces = await this.ubigeoRepository.listProvincesByDepartmentIds(departmentIds);

    return successResponse(
      "Provincias obtenidas correctamente",
      provinces.map((province) => UbigeoOutputMapper.toProvinceOutput(province)),
    );
  }

  private async resolveDepartmentIds(input: ListUbigeoProvincesInput): Promise<string[]> {
    const departmentIds = Array.from(
      new Set((input.departmentIds ?? []).map((item) => item?.trim()).filter(Boolean)),
    );
    if (departmentIds.length) {
      const departments = await this.ubigeoRepository.findDepartmentsByIds(departmentIds);
      if (departments.length !== departmentIds.length) {
        throw new BadRequestException("Uno o mas departmentIds enviados no existen");
      }

      return departments.map((department) => department.id);
    }

    const departmentId = input.departmentId?.trim();
    if (departmentId) {
      const department = await this.ubigeoRepository.findDepartmentById(departmentId);
      if (!department) {
        throw new BadRequestException("El departmentId enviado no existe");
      }

      return [department.id];
    }

    const departmentName = input.department?.trim();
    if (!departmentName) {
      throw new BadRequestException("Debes enviar departmentId o department");
    }

    const department = await this.ubigeoRepository.findDepartmentByNormalizedName(
      normalizeUbigeoName(departmentName),
    );

    if (!department) {
      throw new BadRequestException("El department enviado no existe");
    }

    return [department.id];
  }
}
