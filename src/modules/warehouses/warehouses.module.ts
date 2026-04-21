import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LocationsController } from "./adapters/in/controllers/location.controller";
import { WarehousesController } from "./adapters/in/controllers/warehouse.controller";
import { WarehouseLocationEntity } from "./adapters/out/persistence/typeorm/entities/warehouse-location";
import { WarehouseEntity } from "./adapters/out/persistence/typeorm/entities/warehouse";
import { ProductCatalogModule } from "../product-catalog/product-catalog.module";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { LOCATION_REPOSITORY } from "./application/ports/location.repository.port";
import { WAREHOUSE_REPOSITORY } from "./application/ports/warehouse.repository.port";
import { warehousesModuleProviders } from "./composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseEntity,
      WarehouseLocationEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
    ]),
    ProductCatalogModule,
  ],
  controllers: [WarehousesController, LocationsController],
  providers: [...warehousesModuleProviders],
  exports: [WAREHOUSE_REPOSITORY, LOCATION_REPOSITORY],
})
export class WarehousesModule {}
