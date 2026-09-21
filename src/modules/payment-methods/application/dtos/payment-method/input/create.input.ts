export interface CreatePaymentMethodInput {
  name: string;
  code?: string;
  isActive?: boolean;
  requiresVoucher?: boolean;
}
