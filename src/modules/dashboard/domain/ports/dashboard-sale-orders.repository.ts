import {
  DashboardSaleOrdersUbigeoBaseInput,
  DashboardSaleOrdersUbigeoDistrictInput,
  DashboardSaleOrdersUbigeoProvinceInput,
} from "src/modules/dashboard/application/dtos/dashboard-sale-orders-ubigeo.input";
import { DashboardSaleOrdersUbigeoOutput } from "src/modules/dashboard/application/dtos/dashboard-sale-orders-ubigeo.output";

export const DASHBOARD_SALE_ORDERS_REPOSITORY = Symbol("DASHBOARD_SALE_ORDERS_REPOSITORY");

export interface DashboardSaleOrdersRepository {
  groupByDepartment(input: DashboardSaleOrdersUbigeoBaseInput): Promise<DashboardSaleOrdersUbigeoOutput>;
  groupByProvince(input: DashboardSaleOrdersUbigeoProvinceInput): Promise<DashboardSaleOrdersUbigeoOutput>;
  groupByDistrict(input: DashboardSaleOrdersUbigeoDistrictInput): Promise<DashboardSaleOrdersUbigeoOutput>;
}
