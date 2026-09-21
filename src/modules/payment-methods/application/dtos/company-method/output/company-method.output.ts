export interface CompanyMethodOutput {
  companyMethodId: string;
  companyId: string;
  methodId: string;
  methodName: string;
  methodCode?: string;
  category?: string;
  isActive: boolean;
  requiresVoucher: boolean;
  enabled: boolean;
}
