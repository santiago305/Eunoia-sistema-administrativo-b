export interface CreateCompanyInput {
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
  production?: boolean;
  isActive?: boolean;
}
