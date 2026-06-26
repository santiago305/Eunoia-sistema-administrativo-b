import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { DashboardController } from "src/modules/dashboard/adapters/in/controllers/dashboard.controller";
import { dashboardModuleProviders } from "src/modules/dashboard/composition/container";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { UbigeoDepartmentEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-department.entity";
import { UbigeoDistrictEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity";
import { UbigeoProvinceEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity";
import { SaleOrderStatesEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity";
import { WorkflowStateEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-state.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleOrderEntity,
      ClientEntity,
      UbigeoDepartmentEntity,
      UbigeoProvinceEntity,
      UbigeoDistrictEntity,
      WorkflowStateEntity,
      SaleOrderStatesEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [...dashboardModuleProviders],
})
export class DashboardModule {}
