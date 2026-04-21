import { UbigeoDepartment } from "../entities/ubigeo-department";
import { UbigeoDistrict } from "../entities/ubigeo-district";
import { UbigeoProvince } from "../entities/ubigeo-province";

export const UBIGEO_REPOSITORY = Symbol("UBIGEO_REPOSITORY");

export interface UbigeoCatalog {
  departments: UbigeoDepartment[];
  provinces: UbigeoProvince[];
  districts: UbigeoDistrict[];
}

export interface UbigeoByCodeRecord {
  department: UbigeoDepartment;
  province: UbigeoProvince;
  district: UbigeoDistrict;
}

export interface UbigeoRepository {
  getCatalog(): Promise<UbigeoCatalog>;
  listDepartments(): Promise<UbigeoDepartment[]>;
  findDepartmentById(departmentId: string): Promise<UbigeoDepartment | null>;
  findDepartmentsByIds(departmentIds: string[]): Promise<UbigeoDepartment[]>;
  findDepartmentByNormalizedName(normalizedName: string): Promise<UbigeoDepartment | null>;
  listProvincesByDepartmentIds(departmentIds: string[]): Promise<UbigeoProvince[]>;
  findProvinceById(provinceId: string): Promise<UbigeoProvince | null>;
  findProvincesByIds(provinceIds: string[]): Promise<UbigeoProvince[]>;
  findProvinceByNormalizedName(
    departmentId: string,
    normalizedName: string,
  ): Promise<UbigeoProvince | null>;
  listDistrictsByProvinceIds(provinceIds: string[]): Promise<UbigeoDistrict[]>;
  findByDistrictCode(code: string): Promise<UbigeoByCodeRecord | null>;
}
