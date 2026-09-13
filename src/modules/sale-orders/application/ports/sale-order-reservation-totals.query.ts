import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';

export const SALE_ORDER_RESERVATION_TOTALS_QUERY = Symbol(
  'SALE_ORDER_RESERVATION_TOTALS_QUERY',
);

export type ExpectedInventoryReservation = {
  stockItemId: string;
  skuCode: string;
  productName: string;
  expectedReserved: number;
};

export interface SaleOrderReservationTotalsQuery {
  listExpected(
    input: {
      warehouseId: string;
      stockItemIds: string[];
    },
    tx?: TransactionContext,
  ): Promise<ExpectedInventoryReservation[]>;
}
