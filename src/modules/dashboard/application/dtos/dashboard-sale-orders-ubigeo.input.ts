export type DashboardSaleOrdersUbigeoBaseInput = {
  month?: string;
  cancelBool?: boolean;
};

export type DashboardSaleOrdersUbigeoProvinceInput = DashboardSaleOrdersUbigeoBaseInput & {
  departmentId: string;
};

export type DashboardSaleOrdersUbigeoDistrictInput = DashboardSaleOrdersUbigeoBaseInput & {
  provinceId: string;
};
