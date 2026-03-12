export interface CompanyOutput {
  companyId: string;
  name: string;
  ruc: string;
  ubigeo?: string;
  department?: string;
  province?: string;
  district?: string;
  urbanization?: string;
  address?: string;
  phone?: string;
  email?: string;
  codLocal?: string;
  solUser?: string;
  solPass?: string;
  logoPath?: string;
  certPath?: string;
  production: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
