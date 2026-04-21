export interface UbigeoDepartmentOutput {
  id: string;
  name: string;
}

export interface UbigeoProvinceOutput {
  id: string;
  name: string;
  departmentId: string;
}

export interface UbigeoDistrictOutput {
  id: string;
  name: string;
  provinceId: string;
  departmentId: string;
}

export interface UbigeoCatalogOutput {
  departments: UbigeoDepartmentOutput[];
  provinces: UbigeoProvinceOutput[];
  districts: UbigeoDistrictOutput[];
}

export interface UbigeoByCodeOutput {
  ubigeo: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  department: string;
  province: string;
  district: string;
}
