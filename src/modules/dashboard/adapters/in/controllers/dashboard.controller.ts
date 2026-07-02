import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { GetSaleOrdersUbigeoUsecase } from "src/modules/dashboard/application/usecases/get-sale-orders-ubigeo.usecase";
import { HttpDashboardSaleOrdersUbigeoQueryDto } from "src/modules/dashboard/adapters/in/dtos/http-dashboard-sale-orders-ubigeo.dto";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class DashboardController {
  constructor(private readonly getSaleOrdersUbigeo: GetSaleOrdersUbigeoUsecase) {}

  @Get("sale-orders/ubigeo/departments")
  saleOrdersByDepartment(@Query() query: HttpDashboardSaleOrdersUbigeoQueryDto) {
    return this.getSaleOrdersUbigeo.byDepartment({
      month: query.month,
      filters: query.filters,
      cancelBool: query.cancelBool,
    });
  }

  @Get("sale-orders/ubigeo/departments/:departmentId/provinces")
  saleOrdersByProvince(
    @Param("departmentId") departmentId: string,
    @Query() query: HttpDashboardSaleOrdersUbigeoQueryDto,
  ) {
    return this.getSaleOrdersUbigeo.byProvince({
      departmentId,
      month: query.month,
      filters: query.filters,
      cancelBool: query.cancelBool,
    });
  }

  @Get("sale-orders/ubigeo/provinces/:provinceId/districts")
  saleOrdersByDistrict(
    @Param("provinceId") provinceId: string,
    @Query() query: HttpDashboardSaleOrdersUbigeoQueryDto,
  ) {
    return this.getSaleOrdersUbigeo.byDistrict({
      provinceId,
      month: query.month,
      filters: query.filters,
      cancelBool: query.cancelBool,
    });
  }
}
