import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { HttpSaleOrderCreateDto } from "src/modules/sale-orders/adapters/in/dtos/http-sale-order-create.dto";
import { CreateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/create.usecase";
import { HttpListSaleOrdersQueryDto } from "src/modules/sale-orders/adapters/in/dtos/http-sale-order-list.dto";
import { ListSaleOrdersUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list.usecase";
import { GetSaleOrderComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-components.usecase";
import { GetSaleOrderItemComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-item-components.usecase";
import { HttpSaleOrderUpdateDto } from "src/modules/sale-orders/adapters/in/dtos/http-sale-order-update.dto";
import { UpdateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update.usecase";
import { GetSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get.usecase";
import { GetSaleOrderSearchStateUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/get-state.usecase";
import { SaveSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/save-metric.usecase";
import { DeleteSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/delete-metric.usecase";
import { HttpCreateSaleOrderSearchMetricDto } from "src/modules/sale-orders/adapters/in/dtos/http-sale-order-search-metric-create.dto";
import { sanitizeSaleOrderSearchSnapshot } from "src/modules/sale-orders/application/support/sale-order-search.utils";
import { UpdateSaleOrderStatusUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update-status.usecase";
import { UpdateSaleOrderStatusDto } from "../dtos/update-sale-order-status.dto";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { NotificationRealtimeService } from "src/modules/mail/infrastructure/realtime/notification-realtime.service";
import { AddSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase";
import { DeleteSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase";
import { ListSaleOrderPaymentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase";
import { AddSaleOrderPaymentDto } from "../dtos/add-sale-order-payment.dto";
import { ConfirmSaleOrderDeliveryUsecase } from "src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase";

@Controller("sale-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SaleOrdersController {
  constructor(
    private readonly createSaleOrder: CreateSaleOrderUsecase,
    private readonly listSaleOrders: ListSaleOrdersUsecase,
    private readonly getSaleOrder: GetSaleOrderUsecase,
    private readonly getComponents: GetSaleOrderComponentsUsecase,
    private readonly getItemComponents: GetSaleOrderItemComponentsUsecase,
    private readonly updateSaleOrder: UpdateSaleOrderUsecase,
    private readonly getSearchState: GetSaleOrderSearchStateUsecase,
    private readonly saveSearchMetric: SaveSaleOrderSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteSaleOrderSearchMetricUsecase,
    private readonly updateSaleOrderStatusUsecase: UpdateSaleOrderStatusUsecase,
    private readonly cancelSaleOrder: CancelSaleOrderUsecase,
    private readonly confirmDelivery: ConfirmSaleOrderDeliveryUsecase,
    private readonly addPayment: AddSaleOrderPaymentUsecase,
    private readonly deletePayment: DeleteSaleOrderPaymentUsecase,
    private readonly listPayments: ListSaleOrderPaymentsUsecase,
    private readonly realtimeService: NotificationRealtimeService,
  ) {}

  @Post()
  create(@Body() dto: HttpSaleOrderCreateDto, @CurrentUser() user: { id: string }) {
    return this.createSaleOrder.execute(
      {
        warehouseId: dto.warehouseId,
        clientId: dto.clientId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        subTotal: dto.subTotal,
        total: dto.total,
        deliveryType: dto.deliveryType,
        note: dto.note,
        items: (dto.items ?? []).map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          description: item.description,
          referencePackId: item.referencePackId,
          components: item.components?.map((c) => ({
            skuId: c.skuId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            total: c.total,
            referencePackItemId: c.referencePackItemId,
          })),
        })),
        payments: dto.payments?.map((p) => ({
          bankAccountId: p.bankAccountId,
          method: p.method,
          amount: p.amount,
          date: p.date,
          operationNumber: p.operationNumber,
          note: p.note,
        })),
      },
      user.id,
    );
  }
  @Patch(":saleOrderId/status")
  async updateStatus(
    @Param("saleOrderId") saleOrderId: string,
    @Body() body: UpdateSaleOrderStatusDto,
  ) {
    const order = await this.updateSaleOrderStatusUsecase.execute({
      saleOrderId,
      agendaStatus: body.agendaStatus,
      deliveryStatus: body.deliveryStatus,
    });

    return {
      type: "success",
      message: "Estado del pedido actualizado correctamente.",
      data: order,
    };
  }

  @Patch(":saleOrderId/cancel")
  async cancel(@Param("saleOrderId", ParseUUIDPipe) saleOrderId: string) {
    const result = await this.cancelSaleOrder.execute({ saleOrderId });
    this.realtimeService.emitToAllConnected("sale-orders.updated", { updated: 1, saleOrderIds: [saleOrderId] });
    return result;
  }

  @Patch(":saleOrderId/confirm-delivery")
  confirmDeliveryForSaleOrder(@Param("saleOrderId", ParseUUIDPipe) saleOrderId: string) {
    return this.confirmDelivery.execute({ saleOrderId });
  }

  @Get(":saleOrderId/payments")
  listSaleOrderPayments(@Param("saleOrderId", ParseUUIDPipe) saleOrderId: string) {
    return this.listPayments.execute({ saleOrderId });
  }

  @Post(":saleOrderId/payments")
  async addSaleOrderPayment(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @Body() dto: AddSaleOrderPaymentDto,
  ) {
    const result = await this.addPayment.execute({
      saleOrderId,
      bankAccountId: dto.bankAccountId,
      method: dto.method,
      amount: dto.amount,
      date: dto.date,
      operationNumber: dto.operationNumber,
      note: dto.note,
    });

    this.realtimeService.emitToAllConnected("sale-orders.updated", { updated: 1, saleOrderIds: [saleOrderId] });
    return result;
  }

  @Delete(":saleOrderId/payments/:paymentId")
  async deleteSaleOrderPayment(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
  ) {
    const result = await this.deletePayment.execute({ saleOrderId, paymentId });
    this.realtimeService.emitToAllConnected("sale-orders.updated", { updated: 1, saleOrderIds: [saleOrderId] });
    return result;
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) saleOrderId: string,
    @Body() dto: HttpSaleOrderUpdateDto,
  ) {
    return this.updateSaleOrder.execute(
      {
        saleOrderId,
        warehouseId: dto.warehouseId,
        clientId: dto.clientId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        subTotal: dto.subTotal,
        total: dto.total,
        deliveryType: dto.deliveryType,
        note: dto.note,
        items: (dto.items ?? []).map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          description: item.description,
          referencePackId: item.referencePackId,
          components: item.components?.map((c) => ({
            skuId: c.skuId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            total: c.total,
            referencePackItemId: c.referencePackItemId,
          })),
        })),
        payments: dto.payments?.map((p) => ({
          bankAccountId: p.bankAccountId,
          method: p.method,
          amount: p.amount,
          date: p.date,
          operationNumber: p.operationNumber,
          note: p.note,
        })),
      },
    );
  }

  @Get()
  list(@Query() query: HttpListSaleOrdersQueryDto, @CurrentUser() user: { id: string }) {
    return this.listSaleOrders.execute({
      q: query.q,
      filters: query.filters,
      page: query.page,
      limit: query.limit,
      requestedBy: user?.id,
    });
  }

  @Get("items/:itemId/components")
  listItemComponents(@Param("itemId", ParseUUIDPipe) saleOrderItemId: string) {
    return this.getItemComponents.execute({ saleOrderId: saleOrderItemId });
  }

  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreateSaleOrderSearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeSaleOrderSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @Get(":id/components")
  listComponents(@Param("id", ParseUUIDPipe) saleOrderId: string) {
    return this.getComponents.execute({ saleOrderId });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) saleOrderId: string) {
    return this.getSaleOrder.execute({ saleOrderId });
  }
}
