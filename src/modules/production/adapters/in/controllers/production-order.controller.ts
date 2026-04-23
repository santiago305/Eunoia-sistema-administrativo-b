import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductionOrder } from "src/modules/production/application/usecases/production-order/create.usecase";
import { ListProductionOrders } from "src/modules/production/application/usecases/production-order/list-orders.usecase";
import { GetProductionOrder } from "src/modules/production/application/usecases/production-order/get-record.usecase";
import { UpdateProductionOrder } from "src/modules/production/application/usecases/production-order/update-production-order.usecase";
import { StartProductionOrder } from "src/modules/production/application/usecases/production-order/start.usecase";
import { CloseProductionOrder } from "src/modules/production/application/usecases/production-order/close.usecase";
import { CancelProductionOrder } from "src/modules/production/application/usecases/production-order/cancel.usecase";
import { DeleteProductionOrderSearchMetricUsecase } from "src/modules/production/application/usecases/production-search/delete-metric.usecase";
import { GetProductionOrderSearchStateUsecase } from "src/modules/production/application/usecases/production-search/get-state.usecase";
import { SaveProductionOrderSearchMetricUsecase } from "src/modules/production/application/usecases/production-search/save-metric.usecase";
import { HttpCreateProductionOrderDto } from "../dtos/production-order/http-production-order-create.dto";
import { HttpUpdateProductionOrderDto } from "../dtos/production-order/http-production-order-update.dto";
import { HttpListProductionOrdersQueryDto } from "../dtos/production-order/http-production-order-list.dto";
import { HttpCreateProductionSearchMetricDto } from "../dtos/production-order/http-production-search-metric-create.dto";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { ProductionOrderHttpMapper } from "src/modules/production/application/mappers/production-order-http.mapper";
import { sanitizeProductionSearchSnapshot } from "src/modules/production/application/support/production-search.utils";

@Controller("production-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class ProductionOrdersController {
  constructor(
    private readonly createOrder: CreateProductionOrder,
    private readonly listOrders: ListProductionOrders,
    private readonly getOrder: GetProductionOrder,
    private readonly updateOrder: UpdateProductionOrder,
    private readonly startOrder: StartProductionOrder,
    private readonly closeOrder: CloseProductionOrder,
    private readonly cancelOrder: CancelProductionOrder,
    private readonly getSearchState: GetProductionOrderSearchStateUsecase,
    private readonly saveSearchMetric: SaveProductionOrderSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteProductionOrderSearchMetricUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductionOrderDto, @CurrentUser() user: { id: string } ) {
    return this.createOrder.execute(ProductionOrderHttpMapper.toCreateInput(dto), user.id);
  }

  @Get()
  list(@Query() query: HttpListProductionOrdersQueryDto, @CurrentUser() user: { id: string }) {
    return this.listOrders.execute(ProductionOrderHttpMapper.toListInput({
      q: query.q,
      filters: query.filters,
      status: query.status,
      warehouseId: query.warehouseId,
      skuId: query.skuId,
      from: query.from ? ParseDateLocal(query.from, "start") : undefined,
      to: query.to ? ParseDateLocal(query.to, "end") : undefined,
      page: query.page,
      limit: query.limit,
      requestedBy: user?.id,
    }));
  }

  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Post("search-metrics")
  saveMetric(
    @Body() dto: HttpCreateProductionSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeProductionSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("search-metrics/:metricId")
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ productionId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductionOrderDto
  ,@CurrentUser() user: { id: string } 
) {
    return this.updateOrder.execute(ProductionOrderHttpMapper.toUpdateInput(id, dto), user.id);
  }

  @Post(":id/start")
  start(@Param("id", ParseUUIDPipe) id: string ) {
    return this.startOrder.execute({ productionId: id});
  }

  @Post(":id/close")
  close(@Param("id", ParseUUIDPipe) id: string,  @CurrentUser() user: { id: string } ) {
    return this.closeOrder.execute({ productionId: id, postedBy: user.id });
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.cancelOrder.execute({ productionId: id }, user.id);
  }
}


