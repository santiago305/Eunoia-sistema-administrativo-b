export type DashboardSaleOrdersUbigeoGroupOutput = {
  id: string;
  label: string;
  orders: number;
  total: number;
  deliveryCostSum: number;
  collected: number;
  pending: number;
};

export type DashboardSaleOrdersUbigeoOutput = {
  groups: DashboardSaleOrdersUbigeoGroupOutput[];
  totals: {
    orders: number;
    total: number;
    deliveryCostSum: number;
    collected: number;
    pending: number;
  };
};
