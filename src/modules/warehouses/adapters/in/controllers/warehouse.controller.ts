import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/create.usecase";
import { GetWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-by-id.usecase";
import { GetWarehouseStockUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-stock.usecase";
import { ListWarehousesUsecase } from "src/modules/warehouses/application/usecases/warehouse/list.usecase";
import { SetWarehouseActiveUsecase } from "src/modules/warehouses/application/usecases/warehouse/set-active.usecase";
import { UpdateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/update.usecase";
import { DeleteWarehouseSearchMetricUsecase } from "src/modules/warehouses/application/usecases/warehouse-search/delete-metric.usecase";
import { GetWarehouseSearchStateUsecase } from "src/modules/warehouses/application/usecases/warehouse-search/get-state.usecase";
import { SaveWarehouseSearchMetricUsecase } from "src/modules/warehouses/application/usecases/warehouse-search/save-metric.usecase";
import { HttpCreateWarehouseDto } from "../dtos/warehouse/http-warehouse-create.dto";
import { ListWarehouseQueryDto } from "../dtos/warehouse/http-warehouse-list.dto";
import { HttpCreateWarehouseSearchMetricDto } from "../dtos/warehouse/http-warehouse-search-metric-create.dto";
import { HttpSetWarehouseActiveDto } from "../dtos/warehouse/http-warehouse-set-active.dto";
import { HttpUpdateWarehouseDto } from "../dtos/warehouse/http-warehouse-update.dto";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WarehouseHttpMapper } from "src/modules/warehouses/application/mappers/warehouse-http.mapper";
import { sanitizeWarehouseSearchSnapshot } from "src/modules/warehouses/application/support/warehouse-search.utils";

@Controller("warehouses")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class WarehousesController {
  constructor(
    private readonly createWarehouse: CreateWarehouseUsecase,
    private readonly updateWarehouse: UpdateWarehouseUsecase,
    private readonly setWarehouseActive: SetWarehouseActiveUsecase,
    private readonly listWarehouses: ListWarehousesUsecase,
    private readonly getWarehouse: GetWarehouseUsecase,
    private readonly getWarehouseStock: GetWarehouseStockUsecase,
    private readonly getSearchState: GetWarehouseSearchStateUsecase,
    private readonly saveSearchMetric: SaveWarehouseSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteWarehouseSearchMetricUsecase,
  ) {}

  @RequirePermissions("warehouses.manage")
  @Post()
  create(@Body() dto: HttpCreateWarehouseDto) {
    return this.createWarehouse.execute(WarehouseHttpMapper.toCreateWarehouseInput(dto));
  }

  @RequirePermissions("warehouses.read")
  @Get()
  list(@Query() query: ListWarehouseQueryDto, @CurrentUser() user: { id: string }) {
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
      filters: query.filters,
      requestedBy: user?.id,
    }));
  }

  @RequirePermissions("warehouses.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequirePermissions("warehouses.read")
  @Post("search-metrics")
  saveMetric(
    @Body() dto: HttpCreateWarehouseSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeWarehouseSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("warehouses.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequirePermissions("warehouses.read")
  @Get(":id/stock")
  getStock(@Param("id", ParseUUIDPipe) id: string) {
    return this.getWarehouseStock.execute({ warehouseId: new WarehouseId(id) });
  }

  @RequirePermissions("warehouses.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getWarehouse.execute({ warehouseId: new WarehouseId(id) });
  }

  @RequirePermissions("warehouses.manage")
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateWarehouseDto) {
    return this.updateWarehouse.execute(WarehouseHttpMapper.toUpdateWarehouseInput(id, dto));
  }

  @RequirePermissions("warehouses.manage")
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetWarehouseActiveDto) {
    return this.setWarehouseActive.execute(
      WarehouseHttpMapper.toSetWarehouseActiveInput(id, dto.isActive),
    );
  }
}
