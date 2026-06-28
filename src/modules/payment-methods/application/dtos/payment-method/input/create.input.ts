export interface CreatePaymentMethodInput {
  name: string;
  isActive?: boolean;
  requiresVoucher?: boolean;
}
