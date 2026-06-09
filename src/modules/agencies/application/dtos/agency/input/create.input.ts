export interface SubsidiaryInput {
  id?: string;
  alias: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address?: string;
  basePrice?: number;
  note?: string;
  isActive?: boolean;
}

export interface CreateAgencyInput {
  name: string;
  isActive?: boolean;
  subsidiaries: SubsidiaryInput[];
}

