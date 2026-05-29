import { SaleOrderSearchSnapshot } from "../sale-order-search-snapshot";

export interface SaveSaleOrderSearchMetricInput {
  userId: string;
  name: string;
  snapshot: SaleOrderSearchSnapshot;
}
export type SaleOrderPaymentStatus = "PAID" | "PENDING";



