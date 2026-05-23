export interface CreateAgencyInput {
  name: string;
  reference?: string;
  address?: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive?: boolean;
}

