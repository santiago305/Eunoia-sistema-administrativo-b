import { fromMinorUnits, toMinorUnits } from './money';

type SaleOrderTotalsInput = {
  itemTotals: ReadonlyArray<number | string | null | undefined>;
  deliveryCost: number | string | null | undefined;
  discount: number | string | null | undefined;
};

export type SaleOrderTotals = {
  subTotal: number;
  deliveryCost: number;
  discount: number;
  total: number;
};

export const calculateSaleOrderTotals = ({
  itemTotals,
  deliveryCost,
  discount,
}: SaleOrderTotalsInput): SaleOrderTotals => {
  const subTotalCents = itemTotals.reduce<number>(
    (sum, itemTotal) => sum + toMinorUnits(itemTotal ?? 0),
    0,
  );
  const deliveryCostCents = toMinorUnits(deliveryCost ?? 0);
  const discountCents = toMinorUnits(discount ?? 0);

  return {
    subTotal: fromMinorUnits(subTotalCents),
    deliveryCost: fromMinorUnits(deliveryCostCents),
    discount: fromMinorUnits(discountCents),
    total: fromMinorUnits(Math.max(subTotalCents + deliveryCostCents - discountCents, 0)),
  };
};
