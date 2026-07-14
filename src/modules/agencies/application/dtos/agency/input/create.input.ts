export interface SubsidiaryInput {
  id?: string;
  alias: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address?: string;
  basePrice?: number;
  note?: string;
  generatesPayable?: boolean;
  payableSupplierId?: string;
  payableDescription?: string;
  isActive?: boolean;
}

export interface CreateAgencyInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
  subsidiaries: SubsidiaryInput[];
}

