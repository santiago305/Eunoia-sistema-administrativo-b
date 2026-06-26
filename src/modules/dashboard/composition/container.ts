import { DashboardSaleOrdersTypeormRepository } from "src/modules/dashboard/adapters/out/persistence/typeorm/repositories/dashboard-sale-orders.typeorm.repo";
import { GetSaleOrdersUbigeoUsecase } from "src/modules/dashboard/application/usecases/get-sale-orders-ubigeo.usecase";
import { DASHBOARD_SALE_ORDERS_REPOSITORY } from "src/modules/dashboard/domain/ports/dashboard-sale-orders.repository";

export const dashboardModuleProviders = [
  { provide: DASHBOARD_SALE_ORDERS_REPOSITORY, useClass: DashboardSaleOrdersTypeormRepository },
  GetSaleOrdersUbigeoUsecase,
];
