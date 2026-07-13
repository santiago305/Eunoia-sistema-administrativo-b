import { PaymentSearchSnapshot } from "../payment-search-snapshot";

export interface SavePaymentSearchMetricInput {
  userId: string;
  name: string;
  snapshot: PaymentSearchSnapshot;
}
