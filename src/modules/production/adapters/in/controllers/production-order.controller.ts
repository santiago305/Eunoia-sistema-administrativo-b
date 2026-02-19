import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateProductionOrder } from "src/modules/production/application/usecases/production-order/create-production-order.usecase";
import { ListProductionOrders } from "src/modules/production/application/usecases/production-order/list-production-orders.usecase";
import { GetProductionOrder } from "src/modules/production/application/usecases/production-order/get-production-order.usecase";
import { UpdateProductionOrder } from "src/modules/production/application/usecases/production-order/update-production-order.usecase";
import { StartProductionOrder } from "src/modules/production/application/usecases/production-order/start-production-order.usecase";
import { CloseProductionOrder } from "src/modules/production/application/usecases/production-order/close-production-order.usecase";
import { CancelProductionOrder } from "src/modules/production/application/usecases/production-order/cancel-production-order.usecase";
import { AddProductionOrderItem } from "src/modules/production/application/usecases/production-order/add-production-order-item.usecase";
import { UpdateProductionOrderItem } from "src/modules/production/application/usecases/production-order/update-production-order-item.usecase";
import { RemoveProductionOrderItem } from "src/modules/production/application/usecases/production-order/remove-production-order-item.usecase";
import { HttpCreateProductionOrderDto } from "../dtos/production-order/http-production-order-create.dto";
import { HttpUpdateProductionOrderDto } from "../dtos/production-order/http-production-order-update.dto";
import { HttpListProductionOrdersQueryDto } from "../dtos/production-order/http-production-order-list.dto";
import { HttpAddProductionOrderItemDto } from "../dtos/production-order/http-production-order-item-create.dto";
import { HttpUpdateProductionOrderItemDto } from "../dtos/production-order/http-production-order-item-update.dto";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';

@Controller("production-orders")
@UseGuards(JwtAuthGuard)
export class ProductionOrdersController {
  constructor(
    private readonly createOrder: CreateProductionOrder,
    private readonly listOrders: ListProductionOrders,
    private readonly getOrder: GetProductionOrder,
    private readonly updateOrder: UpdateProductionOrder,
    private readonly startOrder: StartProductionOrder,
    private readonly closeOrder: CloseProductionOrder,
    private readonly cancelOrder: CancelProductionOrder,
    private readonly addItem: AddProductionOrderItem,
    private readonly updateItem: UpdateProductionOrderItem,
    private readonly removeItem: RemoveProductionOrderItem,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductionOrderDto, @CurrentUser() user: { id: string } ) {
    return this.createOrder.execute(dto, user.id);
  }

  @Get()
  list(@Query() query: HttpListProductionOrdersQueryDto) {
    return this.listOrders.execute({
      status: query.status,
      warehouseId: query.warehouseId,
      from: query.from ? ParseDateLocal(query.from, "start") : undefined,
      to: query.to ? ParseDateLocal(query.to, "end") : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ productionId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductionOrderDto
  ,@CurrentUser() user: { id: string } 
) {
    return this.updateOrder.execute({ productionId: id, ...dto }, user.id);
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

  @Post(":id/items")
  addOrderItem(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpAddProductionOrderItemDto) {
    return this.addItem.execute({ productionId: id, ...dto });
  }

  @Patch(":id/items/:itemId")
  updateOrderItem(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: HttpUpdateProductionOrderItemDto,
  ) {
    return this.updateItem.execute({ productionId: id, itemId, ...dto });
  }

  @Delete(":id/items/:itemId")
  removeOrderItem(@Param("id", ParseUUIDPipe) id: string, @Param("itemId", ParseUUIDPipe) itemId: string) {
    return this.removeItem.execute({ productionId: id, itemId });
  }
}


