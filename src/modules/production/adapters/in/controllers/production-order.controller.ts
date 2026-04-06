import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateProductionOrder } from "src/modules/production/application/usecases/production-order/create.usecase";
import { ListProductionOrders } from "src/modules/production/application/usecases/production-order/list-orders.usecase";
import { GetProductionOrder } from "src/modules/production/application/usecases/production-order/get-record.usecase";
import { UpdateProductionOrder } from "src/modules/production/application/usecases/production-order/update-production-order.usecase";
import { StartProductionOrder } from "src/modules/production/application/usecases/production-order/start.usecase";
import { CloseProductionOrder } from "src/modules/production/application/usecases/production-order/close.usecase";
import { CancelProductionOrder } from "src/modules/production/application/usecases/production-order/cancel.usecase";
import { AddProductionOrderItem } from "src/modules/production/application/usecases/production-order/add-item.usecase";
import { RemoveProductionOrderItem } from "src/modules/production/application/usecases/production-order/remove-production-order-item.usecase";
import { UpdateProductionWaste } from "src/modules/production/application/usecases/production-order/update-waste.usecase";
import { HttpCreateProductionOrderDto } from "../dtos/production-order/http-production-order-create.dto";
import { HttpUpdateProductionOrderDto } from "../dtos/production-order/http-production-order-update.dto";
import { HttpListProductionOrdersQueryDto } from "../dtos/production-order/http-production-order-list.dto";
import { HttpAddProductionOrderItemDto } from "../dtos/production-order/http-production-order-item-create.dto";
import { HttpUpdateProductionWasteDto } from "../dtos/production-order/http-production-order-waste.dto";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { ProductionOrderHttpMapper } from "src/modules/production/application/mappers/production-order-http.mapper";

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
    private readonly removeItem: RemoveProductionOrderItem,
    private readonly updateWaste: UpdateProductionWaste,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductionOrderDto, @CurrentUser() user: { id: string } ) {
    return this.createOrder.execute(ProductionOrderHttpMapper.toCreateInput(dto), user.id);
  }

  @Get()
  list(@Query() query: HttpListProductionOrdersQueryDto) {
    return this.listOrders.execute(ProductionOrderHttpMapper.toListInput({
      status: query.status,
      warehouseId: query.warehouseId,
      from: query.from ? ParseDateLocal(query.from, "start") : undefined,
      to: query.to ? ParseDateLocal(query.to, "end") : undefined,
      page: query.page,
      limit: query.limit,
    }));
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

  @Patch(":id/waste")
  updateProductionWaste(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpUpdateProductionWasteDto,
  ) {
    return this.updateWaste.execute(ProductionOrderHttpMapper.toWasteInput(id, { items: dto.items }));
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.cancelOrder.execute({ productionId: id }, user.id);
  }

  @Post(":id/items")
  addOrderItem(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpAddProductionOrderItemDto) {
    return this.addItem.execute(ProductionOrderHttpMapper.toAddItemInput(id, dto));
  }

  @Delete(":id/items/:itemId")
  removeOrderItem(@Param("id", ParseUUIDPipe) id: string, @Param("itemId", ParseUUIDPipe) itemId: string) {
    return this.removeItem.execute({ productionId: id, itemId });
  }
}


