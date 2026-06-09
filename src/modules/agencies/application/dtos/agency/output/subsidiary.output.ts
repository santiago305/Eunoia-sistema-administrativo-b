export interface SubsidiaryOutput {
  id: string;
  agencyId: string;
  alias: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address?: string;
  basePrice: number;
  note?: string;
  isActive: boolean;
}
