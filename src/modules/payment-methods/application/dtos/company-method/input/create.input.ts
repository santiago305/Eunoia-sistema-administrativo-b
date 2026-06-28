export interface CreateCompanyMethodInput {
  companyId: string;
  methodId: string;
  number?: string | null;
  requiresVoucher?: boolean;
}
