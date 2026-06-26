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
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { AddSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase";
import { DeleteSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase";
import { ListSaleOrderPaymentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase";
import { AddSaleOrderPaymentDto } from "../dtos/add-sale-order-payment.dto";
import { ConfirmSaleOrderDeliveryUsecase } from "src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase";
import { CreateFromImportPreviewUseCase } from "src/modules/sale-orders/application/usecases/sale-order/create-from-import-preview.usecase";
import { CreateSaleOrdersFromImportPreviewInput } from "src/modules/sale-orders/application/dtos/import-preview/create-sale-orders-from-preview.input";
import { AdvanceSaleOrderStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-state.usecase";
import { ChangeSaleOrderStateDto } from "../dtos/change-sale-order-state.dto";
import { AssignSaleOrderWorkflowUseCase } from "src/modules/workflow/application/usecases/assign-sale-order-workflow.usecase";
import { GetAvailableTransitionsUseCase } from "src/modules/workflow/application/usecases/get-available-transitions.usecase";
import { GetOrderTimelineUseCase } from "src/modules/workflow/application/usecases/get-order-timeline.usecase";
import { AssignWorkflowDto } from "../dtos/assign-workflow.dto";
import { GetSaleOrderStatisticsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-statistics.usecase";
import { HttpSaleOrderStatisticsQueryDto } from "../dtos/http-sale-order-statistics.dto";
import {
  SaleOrderAutomaticWorkflowService,
  SaleOrderAutomaticWorkflowTriggerEnum,
} from "src/modules/sale-orders/application/services/sale-order-automatic-workflow.service";
import { SaleOrderRealtimePayloadService } from "src/modules/sale-orders/application/services/sale-order-realtime-payload.service";

@Controller("sale-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SaleOrdersController {
  constructor(
    private readonly createSaleOrder: CreateSaleOrderUsecase,
    private readonly listSaleOrders: ListSaleOrdersUsecase,
    private readonly getSaleOrderStatistics: GetSaleOrderStatisticsUsecase,
    private readonly getSaleOrder: GetSaleOrderUsecase,
    private readonly getComponents: GetSaleOrderComponentsUsecase,
    private readonly getItemComponents: GetSaleOrderItemComponentsUsecase,
    private readonly updateSaleOrder: UpdateSaleOrderUsecase,
    private readonly getSearchState: GetSaleOrderSearchStateUsecase,
    private readonly saveSearchMetric: SaveSaleOrderSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteSaleOrderSearchMetricUsecase,
    private readonly advanceSaleOrderState: AdvanceSaleOrderStateUseCase,
    private readonly assignWorkflow: AssignSaleOrderWorkflowUseCase,
    private readonly getAvailableTransitions: GetAvailableTransitionsUseCase,
    private readonly getOrderTimeline: GetOrderTimelineUseCase,
    private readonly cancelSaleOrder: CancelSaleOrderUsecase,
    private readonly confirmDelivery: ConfirmSaleOrderDeliveryUsecase,
    private readonly addPayment: AddSaleOrderPaymentUsecase,
    private readonly deletePayment: DeleteSaleOrderPaymentUsecase,
    private readonly listPayments: ListSaleOrderPaymentsUsecase,
    private readonly createFromImportPreview: CreateFromImportPreviewUseCase,
    private readonly realtimeService: SaleOrdersRealtimeService,
    private readonly automaticWorkflow: SaleOrderAutomaticWorkflowService,
    private readonly realtimePayload: SaleOrderRealtimePayloadService,
  ) {}

  private async notifySaleOrderUpdated(saleOrderId: string, source: string, saleOrder?: unknown) {
    const saleOrders = await this.notifySaleOrdersUpdated([saleOrderId], source);
    return saleOrders[0] ?? saleOrder;
  }

  private async notifySaleOrdersUpdated(saleOrderIds: string[], source: string) {
    const payload = await this.realtimePayload.build({
      updated: saleOrderIds.length || 1,
      saleOrderIds,
      source,
    });
    this.realtimeService.emitToAllConnected("sale-orders.updated", payload);

    return payload.saleOrders ?? [];
  }

  private async evaluateAutomaticWorkflowThenNotify(
    saleOrderId: string,
    trigger: SaleOrderAutomaticWorkflowTriggerEnum,
  ) {
    const result = await this.automaticWorkflow.evaluateAndNotify(saleOrderId, trigger);
    if (!result.updated) {
      await this.notifySaleOrderUpdated(saleOrderId, trigger);
    }
    return result;
  }

  @Post()
  async create(@Body() dto: HttpSaleOrderCreateDto, @CurrentUser() user: { id: string }) {
    const result = await this.createSaleOrder.execute(
      {
        warehouseId: dto.warehouseId,
        clientId: dto.clientId,
        workflowId: dto.workflowId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        subTotal: dto.subTotal,
        total: dto.total,
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

    if (result?.orderId) {
      await this.evaluateAutomaticWorkflowThenNotify(
        result.orderId,
        SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CREATED,
      );
    }

    return result;
  }

  @Post("import-preview")
  async createFromPreview(
    @Body() dto: CreateSaleOrdersFromImportPreviewInput | CreateSaleOrdersFromImportPreviewInput["rows"],
    @CurrentUser() user: { id: string },
  ) {
    const rows = Array.isArray(dto) ? dto : dto.rows ?? [];

    const result = await this.createFromImportPreview.execute({
      rows,
      userId: user.id,
    });

    const importedSaleOrderIds = (result.rows ?? [])
      .map((row: { saleOrderId?: string; id?: string }) => row.saleOrderId ?? row.id)
      .filter((id): id is string => Boolean(id));

    const importedSaleOrderIdsWithoutAutomaticWorkflow: string[] = [];

    for (const saleOrderId of importedSaleOrderIds) {
      const result = await this.automaticWorkflow.evaluateAndNotify(
        saleOrderId,
        SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_IMPORTED,
      );
      if (!result.updated) {
        importedSaleOrderIdsWithoutAutomaticWorkflow.push(saleOrderId);
      }
    }

    if (importedSaleOrderIdsWithoutAutomaticWorkflow.length) {
      await this.notifySaleOrdersUpdated(
        importedSaleOrderIdsWithoutAutomaticWorkflow,
        SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_IMPORTED,
      );
    }

    return result;
  }

  @Post(":saleOrderId/change-state")
  async changeState(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @Body() body: ChangeSaleOrderStateDto,
    @CurrentUser() user: { id: string },
  ) {
    const order = await this.advanceSaleOrderState.execute({
      saleOrderId,
      transitionId: body.transitionId,
      metadata: body.metadata,
      executedBy: user.id,
    });

    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.WORKFLOW_STATE_CHANGED,
    );

    return {
      type: "success",
      message: "Estado del pedido actualizado correctamente mediante workflow.",
      data: order,
    };
  }

  @Post(":saleOrderId/assign-workflow")
  async assignSaleOrderWorkflow(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @Body() body: AssignWorkflowDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.assignWorkflow.execute({
      saleOrderId,
      workflowId: body.workflowId,
      executedBy: user.id,
    });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.WORKFLOW_ASSIGNED,
    );
    return result;
  }

  @Get(":saleOrderId/available-transitions")
  availableTransitions(@Param("saleOrderId", ParseUUIDPipe) saleOrderId: string) {
    return this.getAvailableTransitions.execute({ saleOrderId });
  }

  @Get(":saleOrderId/history")
  history(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.getOrderTimeline.execute({ saleOrderId });
  }

  @Patch(":saleOrderId/cancel")
  async cancel(@Param("saleOrderId", ParseUUIDPipe) saleOrderId: string) {
    const result = await this.cancelSaleOrder.execute({ saleOrderId });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CANCELLED,
    );
    return result;
  }

  @Patch(":saleOrderId/confirm-delivery")
  async confirmDeliveryForSaleOrder(@Param("saleOrderId", ParseUUIDPipe) saleOrderId: string) {
    const result = await this.confirmDelivery.execute({ saleOrderId });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.DELIVERY_CONFIRMED,
    );
    return result;
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

    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.PAYMENT_CREATED,
    );
    return result;
  }

  @Delete(":saleOrderId/payments/:paymentId")
  async deleteSaleOrderPayment(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
  ) {
    const result = await this.deletePayment.execute({ saleOrderId, paymentId });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.PAYMENT_DELETED,
    );
    return result;
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) saleOrderId: string,
    @Body() dto: HttpSaleOrderUpdateDto,
  ) {
    const result = await this.updateSaleOrder.execute(
      {
        saleOrderId,
        warehouseId: dto.warehouseId,
        workflowId: dto.workflowId,
        clientId: dto.clientId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        subTotal: dto.subTotal,
        total: dto.total,
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

    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED,
    );
    return result;
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

  @Get("statistics")
  statistics(@Query() query: HttpSaleOrderStatisticsQueryDto) {
    return this.getSaleOrderStatistics.execute({
      q: query.q,
      filters: query.filters,
      includeCancelled: query.includeCancelled,
    });
  }

  @Get("items/:itemId/components")
  listItemComponents(@Param("itemId", ParseUUIDPipe) saleOrderItemId: string) {
    return this.getItemComponents.execute({ saleOrderItemId: saleOrderItemId });
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
