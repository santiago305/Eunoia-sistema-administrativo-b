import { Provider } from "@nestjs/common";
import { CreateLocationUsecase } from "../usecases/location/create.usecase";
import { GetLocationUsecase } from "../usecases/location/get-by-id.usecase";
import { ListLocationsUsecase } from "../usecases/location/list.usecase";
import { SetLocationActiveUsecase } from "../usecases/location/set-active.usecase";
import { UpdateLocationUsecase } from "../usecases/location/update.usecase";
import { CreateWarehouseUsecase } from "../usecases/warehouse/create.usecase";
import { GetWarehouseUsecase } from "../usecases/warehouse/get-by-id.usecase";
import { GetWarehouseWithLocationsUsecase } from "../usecases/warehouse/get-with-locations.usecase";
import { ListWarehousesUsecase } from "../usecases/warehouse/list.usecase";
import { SetWarehouseActiveUsecase } from "../usecases/warehouse/set-active.usecase";
import { UpdateWarehouseUsecase } from "../usecases/warehouse/update.usecase";

export const warehousesUsecasesProviders: Provider[] = [
  CreateWarehouseUsecase,
  UpdateWarehouseUsecase,
  SetWarehouseActiveUsecase,
  ListWarehousesUsecase,
  GetWarehouseUsecase,
  GetWarehouseWithLocationsUsecase,
  CreateLocationUsecase,
  UpdateLocationUsecase,
  SetLocationActiveUsecase,
  ListLocationsUsecase,
  GetLocationUsecase,
];
