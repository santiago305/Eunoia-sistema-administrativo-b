import { Inject } from "@nestjs/common";
import {
  DASHBOARD_SALE_ORDERS_REPOSITORY,
  DashboardSaleOrdersRepository,
} from "src/modules/dashboard/domain/ports/dashboard-sale-orders.repository";
import {
  DashboardSaleOrdersUbigeoBaseInput,
  DashboardSaleOrdersUbigeoDistrictInput,
  DashboardSaleOrdersUbigeoProvinceInput,
} from "src/modules/dashboard/application/dtos/dashboard-sale-orders-ubigeo.input";

export class GetSaleOrdersUbigeoUsecase {
  constructor(
    @Inject(DASHBOARD_SALE_ORDERS_REPOSITORY)
    private readonly saleOrdersRepo: DashboardSaleOrdersRepository,
  ) {}

  byDepartment(input: DashboardSaleOrdersUbigeoBaseInput) {
    return this.saleOrdersRepo.groupByDepartment(input);
  }

  byProvince(input: DashboardSaleOrdersUbigeoProvinceInput) {
    return this.saleOrdersRepo.groupByProvince(input);
  }

  byDistrict(input: DashboardSaleOrdersUbigeoDistrictInput) {
    return this.saleOrdersRepo.groupByDistrict(input);
  }
}
