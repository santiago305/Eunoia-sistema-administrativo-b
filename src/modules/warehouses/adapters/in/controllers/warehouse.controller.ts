import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/create.usecase";
import { GetWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-by-id.usecase";
import { GetWarehouseStockUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-stock.usecase";
import { ListWarehousesUsecase } from "src/modules/warehouses/application/usecases/warehouse/list.usecase";
import { SetWarehouseActiveUsecase } from "src/modules/warehouses/application/usecases/warehouse/set-active.usecase";
import { UpdateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/update.usecase";
import { GetWarehouseWithLocationsUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-with-locations.usecase";
import { HttpCreateWarehouseDto } from "../dtos/warehouse/http-warehouse-create.dto";
import { ListWarehouseQueryDto } from "../dtos/warehouse/http-warehouse-list.dto";
import { HttpSetWarehouseActiveDto } from "../dtos/warehouse/http-warehouse-set-active.dto";
import { HttpUpdateWarehouseDto } from "../dtos/warehouse/http-warehouse-update.dto";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WarehouseHttpMapper } from "src/modules/warehouses/application/mappers/warehouse-http.mapper";

@Controller("warehouses")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class WarehousesController {
  constructor(
    private readonly createWarehouse: CreateWarehouseUsecase,
    private readonly updateWarehouse: UpdateWarehouseUsecase,
    private readonly setWarehouseActive: SetWarehouseActiveUsecase,
    private readonly listWarehouses: ListWarehousesUsecase,
    private readonly getWarehouse: GetWarehouseUsecase,
    private readonly getWarehouseStock: GetWarehouseStockUsecase,
    private readonly getWarehouseWithLocations: GetWarehouseWithLocationsUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateWarehouseDto) {
    return this.createWarehouse.execute(WarehouseHttpMapper.toCreateWarehouseInput(dto));
  }

  @Get()
  list(@Query() query: ListWarehouseQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listWarehouses.execute(WarehouseHttpMapper.toListWarehouseInput({
      page: query.page,
      limit: query.limit,
      isActive,
      q: query.q,
      name: query.name,
      department: query.department,
      province: query.province,
      district: query.district,
      address: query.address,
    }));
  }

  @Get(":id/stock")
  getStock(@Param("id", ParseUUIDPipe) id: string) {
    return this.getWarehouseStock.execute({ warehouseId: new WarehouseId(id) });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getWarehouse.execute({ warehouseId: new WarehouseId(id) });
  }

  @Get(":id/locations")
  getWithLocations(@Param("id", ParseUUIDPipe) id: string) {
    return this.getWarehouseWithLocations.execute({ warehouseId: new WarehouseId(id) });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateWarehouseDto) {
    return this.updateWarehouse.execute(WarehouseHttpMapper.toUpdateWarehouseInput(id, dto));
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetWarehouseActiveDto) {
    return this.setWarehouseActive.execute(
      WarehouseHttpMapper.toSetWarehouseActiveInput(id, dto.isActive),
    );
  }
}
