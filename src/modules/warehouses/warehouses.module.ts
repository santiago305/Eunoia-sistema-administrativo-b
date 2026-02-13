import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { TypeormUnitOfWork } from "src/modules/inventory/adapters/out/typeorm/uow/typeorm.unit-of-work";
import { CLOCK } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { LocationsController } from "./adapters/in/controllers/location.controller";
import { WarehousesController } from "./adapters/in/controllers/warehouse.controller";
import { WarehouseLocationEntity } from "./adapters/out/persistence/typeorm/entities/warehouse-location";
import { WarehouseEntity } from "./adapters/out/persistence/typeorm/entities/warehouse";
import { LocationTypeormRepo } from "./adapters/out/persistence/typeorm/repositories/location.typeorm.repo";
import { WarehouseTypeormRepo } from "./adapters/out/persistence/typeorm/repositories/warehouse.typeorm.repo";
import { CreateLocationUsecase } from "./application/usecases/location/create.usecase";
import { GetLocationUsecase } from "./application/usecases/location/get-by-id.usecase";
import { ListLocationsUsecase } from "./application/usecases/location/list.usecase";
import { SetLocationActiveUsecase } from "./application/usecases/location/set-active.usecase";
import { UpdateLocationUsecase } from "./application/usecases/location/update.usecase";
import { CreateWarehouseUsecase } from "./application/usecases/warehouse/create.usecase";
import { GetWarehouseUsecase } from "./application/usecases/warehouse/get-by-id.usecase";
import { ListWarehousesUsecase } from "./application/usecases/warehouse/list.usecase";
import { SetWarehouseActiveUsecase } from "./application/usecases/warehouse/set-active.usecase";
import { UpdateWarehouseUsecase } from "./application/usecases/warehouse/update.usecase";
import { LOCATION_REPOSITORY } from "./domain/ports/location.repository.port";
import { WAREHOUSE_REPOSITORY } from "./domain/ports/warehouse.repository.port";

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseEntity, WarehouseLocationEntity])],
  controllers: [WarehousesController, LocationsController],
  providers: [
    CreateWarehouseUsecase,
    UpdateWarehouseUsecase,
    SetWarehouseActiveUsecase,
    ListWarehousesUsecase,
    GetWarehouseUsecase,
    CreateLocationUsecase,
    UpdateLocationUsecase,
    SetLocationActiveUsecase,
    ListLocationsUsecase,
    GetLocationUsecase,
    { provide: WAREHOUSE_REPOSITORY, useClass: WarehouseTypeormRepo },
    { provide: LOCATION_REPOSITORY, useClass: LocationTypeormRepo },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
  exports: [WAREHOUSE_REPOSITORY, LOCATION_REPOSITORY],
})
export class WarehousesModule {}
