import { UbigeoDepartment } from "src/modules/ubigeo/domain/entities/ubigeo-department";
import { UbigeoDistrict } from "src/modules/ubigeo/domain/entities/ubigeo-district";
import { UbigeoProvince } from "src/modules/ubigeo/domain/entities/ubigeo-province";
import {
  UbigeoByCodeOutput,
  UbigeoCatalogOutput,
  UbigeoDepartmentOutput,
  UbigeoDistrictOutput,
  UbigeoProvinceOutput,
} from "../dtos/ubigeo.output";

export class UbigeoOutputMapper {
  static toDepartmentOutput(department: UbigeoDepartment): UbigeoDepartmentOutput {
    return {
      id: department.id,
      name: department.name,
    };
  }

  static toProvinceOutput(province: UbigeoProvince): UbigeoProvinceOutput {
    return {
      id: province.id,
      name: province.name,
      departmentId: province.departmentId,
    };
  }

  static toDistrictOutput(district: UbigeoDistrict): UbigeoDistrictOutput {
    return {
      id: district.id,
      name: district.name,
      provinceId: district.provinceId,
      departmentId: district.departmentId,
    };
  }

  static toCatalogOutput(params: {
    departments: UbigeoDepartment[];
    provinces: UbigeoProvince[];
    districts: UbigeoDistrict[];
  }): UbigeoCatalogOutput {
    return {
      departments: params.departments.map((department) => this.toDepartmentOutput(department)),
      provinces: params.provinces.map((province) => this.toProvinceOutput(province)),
      districts: params.districts.map((district) => this.toDistrictOutput(district)),
    };
  }

  static toByCodeOutput(params: {
    department: UbigeoDepartment;
    province: UbigeoProvince;
    district: UbigeoDistrict;
  }): UbigeoByCodeOutput {
    return {
      ubigeo: params.district.id,
      departmentId: params.department.id,
      provinceId: params.province.id,
      districtId: params.district.id,
      department: params.department.name,
      province: params.province.name,
      district: params.district.name,
    };
  }
}
