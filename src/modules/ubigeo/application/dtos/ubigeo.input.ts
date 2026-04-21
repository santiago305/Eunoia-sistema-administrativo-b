export interface ListUbigeoProvincesInput {
  departmentId?: string;
  departmentIds?: string[];
  department?: string;
}

export interface ListUbigeoDistrictsInput {
  provinceId?: string;
  provinceIds?: string[];
  province?: string;
  departmentId?: string;
  departmentIds?: string[];
  department?: string;
}
