import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateLocationUsecase } from "src/modules/warehouses/application/usecases/location/create.usecase";
import { GetLocationUsecase } from "src/modules/warehouses/application/usecases/location/get-by-id.usecase";
import { ListLocationsUsecase } from "src/modules/warehouses/application/usecases/location/list.usecase";
import { SetLocationActiveUsecase } from "src/modules/warehouses/application/usecases/location/set-active.usecase";
import { UpdateLocationUsecase } from "src/modules/warehouses/application/usecases/location/update.usecase";
import { HttpCreateLocationDto } from "../dtos/location/http-location-create.dto";
import { ListLocationQueryDto } from "../dtos/location/http-location-list.dto";
import { HttpSetLocationActiveDto } from "../dtos/location/http-location-set-active.dto";
import { HttpUpdateLocationDto } from "../dtos/location/http-location-update.dto";
import { LocationId } from "src/modules/warehouses/domain/value-objects/location-id.vo";
import { CreateLocationInput } from "src/modules/warehouses/application/dtos/location/input/create.input";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { UpdateLocationInput } from "src/modules/warehouses/application/dtos/location/input/update.input";

@Controller("warehouses/locations")
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(
    private readonly createLocation: CreateLocationUsecase,
    private readonly updateLocation: UpdateLocationUsecase,
    private readonly setLocationActive: SetLocationActiveUsecase,
    private readonly listLocations: ListLocationsUsecase,
    private readonly getLocation: GetLocationUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateLocationDto) {
    const datos: CreateLocationInput = {
      warehouseId: new WarehouseId(dto.warehouseId),
      code: dto.code,
      description: dto.description,
    };
    return this.createLocation.execute(datos);
  }

  @Get('all')
  list(@Query() query: ListLocationQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    const q = query.q?.trim();

    return this.listLocations.execute({
      page: query.page,
      limit: query.limit,
      isActive,
      q,
      warehouseId: query.warehouseId ? new WarehouseId(query.warehouseId) : undefined,
      code: query.code,
      description: query.description,
    });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getLocation.execute({ locationId: new LocationId(id) });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateLocationDto) {
    const locationIdConst = new LocationId(id);
    const dato: UpdateLocationInput = {
      locationId: locationIdConst,
      warehouseId: new WarehouseId(dto.warehouseId),
      code: dto.code,
      description: dto.description
    }
    return this.updateLocation.execute({ locationId:locationIdConst , ...dato });
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetLocationActiveDto) {
    return this.setLocationActive.execute({ locationId: new LocationId(id), isActive: dto.isActive });
  }
}
