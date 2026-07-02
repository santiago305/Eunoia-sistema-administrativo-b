import { SaleOrderSearchRule } from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";

export type DashboardSaleOrdersUbigeoBaseInput = {
  month?: string;
  filters?: SaleOrderSearchRule[];
  cancelBool?: boolean;
};

export type DashboardSaleOrdersUbigeoProvinceInput = DashboardSaleOrdersUbigeoBaseInput & {
  departmentId: string;
};

export type DashboardSaleOrdersUbigeoDistrictInput = DashboardSaleOrdersUbigeoBaseInput & {
  provinceId: string;
};
