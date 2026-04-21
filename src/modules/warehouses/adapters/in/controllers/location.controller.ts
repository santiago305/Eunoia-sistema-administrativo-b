import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
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
import { WarehouseHttpMapper } from "src/modules/warehouses/application/mappers/warehouse-http.mapper";

@Controller("warehouses/locations")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
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
    return this.createLocation.execute(WarehouseHttpMapper.toCreateLocationInput(dto));
  }

  @Get('all')
  list(@Query() query: ListLocationQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listLocations.execute(WarehouseHttpMapper.toListLocationInput({
      page: query.page,
      limit: query.limit,
      isActive,
      q: query.q,
      warehouseId: query.warehouseId,
      code: query.code,
      description: query.description,
    }));
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getLocation.execute({ locationId: new LocationId(id) });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateLocationDto) {
    return this.updateLocation.execute(WarehouseHttpMapper.toUpdateLocationInput(id, dto));
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetLocationActiveDto) {
    return this.setLocationActive.execute(
      WarehouseHttpMapper.toSetLocationActiveInput(id, dto.isActive),
    );
  }
}
