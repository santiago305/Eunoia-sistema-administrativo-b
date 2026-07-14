import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { UbigeoModule } from "src/modules/ubigeo/ubigeo.module";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { AgenciesController } from "./adapters/in/controllers/agencies.controller";
import { AgencyEntity } from "./adapters/out/persistence/typeorm/entities/agency.entity";
import { SubsidiaryEntity } from "./adapters/out/persistence/typeorm/entities/subsidiary.entity";
import { agenciesModuleProviders } from "./composition/container";
import { AGENCY_REPOSITORY } from "./domain/ports/agency.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgencyEntity,
      SubsidiaryEntity,
      SaleOrderEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
    ]),
    UbigeoModule,
    AccessControlModule,
  ],
  controllers: [AgenciesController],
  providers: [...agenciesModuleProviders],
  exports: [AGENCY_REPOSITORY],
})
export class AgenciesModule {}

