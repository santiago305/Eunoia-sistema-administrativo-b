import { BadRequestException, Inject } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "../../domain/ports/ubigeo.repository";
import { normalizeUbigeoName } from "../../shared/utils/normalize-ubigeo-name.util";
import { ListUbigeoDistrictsInput } from "../dtos/ubigeo.input";
import { UbigeoOutputMapper } from "../mappers/ubigeo-output.mapper";

export class ListDistrictsUsecase {
  constructor(
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}

  async execute(input: ListUbigeoDistrictsInput) {
    const provinceIds = await this.resolveProvinceIds(input);
    const districts = await this.ubigeoRepository.listDistrictsByProvinceIds(provinceIds);

    return successResponse(
      "Distritos obtenidos correctamente",
      districts.map((district) => UbigeoOutputMapper.toDistrictOutput(district)),
    );
  }

  private async resolveProvinceIds(input: ListUbigeoDistrictsInput): Promise<string[]> {
    const provinceIds = Array.from(
      new Set((input.provinceIds ?? []).map((item) => item?.trim()).filter(Boolean)),
    );
    if (provinceIds.length) {
      const provinces = await this.ubigeoRepository.findProvincesByIds(provinceIds);
      if (provinces.length !== provinceIds.length) {
        throw new BadRequestException("Uno o mas provinceIds enviados no existen");
      }

      if (input.departmentId || input.department || input.departmentIds?.length) {
        const departmentIds = await this.resolveDepartmentIds(input);
        const invalidProvince = provinces.find((province) => !departmentIds.includes(province.departmentId));
        if (invalidProvince) {
          throw new BadRequestException(
            "Uno o mas provinceIds no pertenecen a los departamentos enviados",
          );
        }
      }

      return provinces.map((province) => province.id);
    }

    const provinceId = input.provinceId?.trim();
    if (provinceId) {
      const province = await this.ubigeoRepository.findProvinceById(provinceId);
      if (!province) {
        throw new BadRequestException("El provinceId enviado no existe");
      }

      return [province.id];
    }

    const provinceName = input.province?.trim();
    if (!provinceName) {
      throw new BadRequestException("Debes enviar provinceId o province");
    }

    const [departmentId] = await this.resolveDepartmentIds(input);
    const province = await this.ubigeoRepository.findProvinceByNormalizedName(
      departmentId,
      normalizeUbigeoName(provinceName),
    );

    if (!province) {
      throw new BadRequestException("La provincia enviada no existe para el departamento indicado");
    }

    return [province.id];
  }

  private async resolveDepartmentIds(input: ListUbigeoDistrictsInput): Promise<string[]> {
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
      throw new BadRequestException(
        "Cuando envias province por nombre tambien debes enviar departmentId o department",
      );
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
