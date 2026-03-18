import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreatePurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/create.usecase";
import { UpdatePurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/update.usecase";
import { ListPurchaseOrdersUsecase } from "src/modules/purchases/application/usecases/purchase-order/list.usecase";
import { GetPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/get-by-id.usecase";
import { SetPurchaseOrderActiveUsecase } from "src/modules/purchases/application/usecases/purchase-order/set-active.usecase";
import { ListPurchaseOrderItemsUsecase } from "src/modules/purchases/application/usecases/purchase-order-item/list.usecase";
import { RemovePurchaseOrderItemUsecase } from "src/modules/purchases/application/usecases/purchase-order-item/remove.usecase";
import { HttpCreatePurchaseOrderDto } from "../dtos/purchase-order/http-purchase-order-create.dto";
import { HttpUpdatePurchaseOrderDto } from "../dtos/purchase-order/http-purchase-order-update.dto";
import { HttpListPurchaseOrdersQueryDto } from "../dtos/purchase-order/http-purchase-order-list.dto";
import { HttpSetPurchaseOrderActiveDto } from "../dtos/purchase-order/http-purchase-order-set-active.dto";
import { RunExpectedAtUsecase } from "src/modules/purchases/application/usecases/purchase-order/run-expected-at.usecase";
import { SetSentPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/set-sent.usecase";
import { CancelPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/cancel.usecase";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";

@Controller("purchases/orders")
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly createOrder: CreatePurchaseOrderUsecase,
    private readonly updateOrder: UpdatePurchaseOrderUsecase,
    private readonly listOrders: ListPurchaseOrdersUsecase,
    private readonly getOrder: GetPurchaseOrderUsecase,
    private readonly setActiveOrder: SetPurchaseOrderActiveUsecase,
    private readonly listItems: ListPurchaseOrderItemsUsecase,
    private readonly removeItem: RemovePurchaseOrderItemUsecase,
    private readonly runExpected: RunExpectedAtUsecase,
    private readonly setSent: SetSentPurchaseOrderUsecase,
    private readonly cancelOrder: CancelPurchaseOrderUsecase,
  ) {}

  @Post()
  async create(@Body() dto: HttpCreatePurchaseOrderDto, @CurrentUser() user: { id: string }) {
    try {
      const result = await this.createOrder.execute(dto, user.id);
        return {
          type: "success",
          message: "Orden de compra creada correctamente",
          order: {
            ...result.order,
            totalTaxed: result.order.totalTaxed.getAmount(),
            totalExempted: result.order.totalExempted.getAmount(),
            totalIgv: result.order.totalIgv.getAmount(),
            purchaseValue: result.order.purchaseValue.getAmount(),
            total: result.order.total.getAmount(),
          },
        };
    } catch (error: any) {
      const payload = error?.response ?? error;
      return {
        type: "error",
        message: payload?.message ?? "Ocurrio un error al crear la orden de compra",
      };
    }
  }
  @Patch(":id/sent")
  setSentPurchase(@Param("id", ParseUUIDPipe) id: string) {
    return this.setSent.execute(id);
  }

  @Patch(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string) {
    return this.cancelOrder.execute(id);
  }

  @Post(":id/run-expected")
  runExpectedAt(@Param("id", ParseUUIDPipe) id: string) {
    return this.runExpected.execute(id);
  }

  @Get()
  list(@Query() query: HttpListPurchaseOrdersQueryDto) {
    return this.listOrders.execute({
      status: query.status,
      supplierId: query.supplierId,
      warehouseId: query.warehouseId,
      documentType: query.documentType,
      number: query.number,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ poId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdatePurchaseOrderDto) {
    return this.updateOrder.execute({ poId: id, ...dto });
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetPurchaseOrderActiveDto) {
    return this.setActiveOrder.execute({ poId: id, isActive: dto.isActive });
  }

  @Get(":id/items")
  listItemsByOrder(@Param("id", ParseUUIDPipe) id: string) {
    return this.listItems.execute({ poId: id });
  }

  @Delete(":id/items/:itemId")
  removeItemFromOrder(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.removeItem.execute({ poItemId: itemId });
  }
}
