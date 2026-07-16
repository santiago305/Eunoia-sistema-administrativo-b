import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { memoryStorage } from "multer";
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
import { BulkAssignSaleOrdersUsecase } from "src/modules/sale-orders/application/usecases/sale-order/bulk-assign.usecase";
import { BulkChangeSaleOrderStateUsecase } from "src/modules/sale-orders/application/usecases/sale-order/bulk-change-state.usecase";
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
import { SaveSaleOrderWithClientUsecase } from "src/modules/sale-orders/application/usecases/sale-order/save-with-client.usecase";
import { parseSaleOrderMultipart } from "../support/sale-order-multipart.parser";
import { BulkAssignSaleOrdersDto } from "../dtos/bulk-assign-sale-orders.dto";
import { BulkChangeSaleOrderStateDto } from "../dtos/bulk-change-sale-order-state.dto";
import { ExportSaleOrdersExcelUsecase } from "src/modules/sale-orders/application/usecases/sale-order/export-excel.usecase";
import { GetSaleOrderEditorCatalogsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-editor-catalogs.usecase";
import { HttpExportSaleOrdersDto } from "../dtos/http-export-sale-orders.dto";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";

@Controller("sale-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class SaleOrdersController {
  constructor(
    private readonly createSaleOrder: CreateSaleOrderUsecase,
    private readonly listSaleOrders: ListSaleOrdersUsecase,
    private readonly getSaleOrderStatistics: GetSaleOrderStatisticsUsecase,
    private readonly getSaleOrder: GetSaleOrderUsecase,
    private readonly getComponents: GetSaleOrderComponentsUsecase,
    private readonly getItemComponents: GetSaleOrderItemComponentsUsecase,
    private readonly updateSaleOrder: UpdateSaleOrderUsecase,
    private readonly bulkAssignSaleOrders: BulkAssignSaleOrdersUsecase,
    private readonly bulkChangeSaleOrderState: BulkChangeSaleOrderStateUsecase,
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
    private readonly saveWithClient: SaveSaleOrderWithClientUsecase,
    private readonly exportExcel: ExportSaleOrdersExcelUsecase,
    private readonly getEditorCatalogs: GetSaleOrderEditorCatalogsUsecase,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
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

  private getSuccessfulSaleOrderIds(result: {
    data?: { results?: Array<{ saleOrderId: string; status: string }> };
  }) {
    return (result.data?.results ?? [])
      .filter((row) => row.status === "success")
      .map((row) => row.saleOrderId);
  }

  private getChangedSaleOrderIds(result: {
    data?: { results?: Array<{ saleOrderId: string; completedTransitions?: unknown[] }> };
  }) {
    return (result.data?.results ?? [])
      .filter((row) => (row.completedTransitions?.length ?? 0) > 0)
      .map((row) => row.saleOrderId);
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
        agencySubsidiaryId: dto.agencySubsidiaryId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        logisticsCost: dto.logisticsCost,
        subTotal: dto.subTotal,
        total: dto.total,
        note: dto.note,
        advertisingCode: dto.advertisingCode,
        observation: dto.observation,
        sendDate: dto.sendDate,
        sendPhoto: dto.sendPhoto,
        sendCode: dto.sendCode,
        sendAddress: dto.sendAddress,
        assignedBy: dto.assignedBy,
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
          paymentPhoto: p.paymentPhoto,
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

  @Post("with-client")
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { files: 25, fileSize: 15 * 1024 * 1024 },
    }),
  )
  async createWithClient(
    @Body() body: unknown,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() user: { id: string },
  ) {
    const parsed = parseSaleOrderMultipart(body, files);
    const result = await this.saveWithClient.execute({
      ...parsed,
      userId: user.id,
    });

    await this.evaluateAutomaticWorkflowThenNotify(
      result.orderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CREATED,
    );
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

  @Patch("bulk/assigned-by")
  async bulkAssignBy(@Body() dto: BulkAssignSaleOrdersDto) {
    const result = await this.bulkAssignSaleOrders.execute({
      saleOrderIds: dto.saleOrderIds,
      assignedBy: dto.assignedBy ?? null,
    });

    const successfulIds = this.getSuccessfulSaleOrderIds(result);
    if (successfulIds.length) {
      await this.notifySaleOrdersUpdated(
        successfulIds,
        "sale-orders-bulk-assigned-by",
      );
    }

    return result;
  }

  @Post("bulk/change-state")
  async bulkChangeState(
    @Body() body: BulkChangeSaleOrderStateDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.bulkChangeSaleOrderState.execute({
      saleOrderIds: body.saleOrderIds,
      targetStateId: body.targetStateId,
      executedBy: user.id,
    });

    const changedSaleOrderIds = this.getChangedSaleOrderIds(result);
    if (changedSaleOrderIds.length) {
      await this.notifySaleOrdersUpdated(
        changedSaleOrderIds,
        "sale-orders-bulk-target-state",
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
    const result = await this.advanceSaleOrderState.execute({
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
      data: result.order,
      warnings: result.warnings,
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
      paymentPhoto: dto.paymentPhoto,
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
        agencySubsidiaryId: dto.agencySubsidiaryId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        logisticsCost: dto.logisticsCost,
        subTotal: dto.subTotal,
        total: dto.total,
        note: dto.note,
        advertisingCode: dto.advertisingCode,
        observation: dto.observation,
        sendDate: dto.sendDate,
        sendPhoto: dto.sendPhoto,
        sendCode: dto.sendCode,
        sendAddress: dto.sendAddress,
        assignedBy: dto.assignedBy,
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
          paymentPhoto: p.paymentPhoto,
        })),
      },
    );

    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED,
    );
    return result;
  }

  @Patch(":saleOrderId/with-client")
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { files: 25, fileSize: 15 * 1024 * 1024 },
    }),
  )
  async updateWithClient(
    @Param("saleOrderId", ParseUUIDPipe) saleOrderId: string,
    @Body() body: unknown,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() user: { id: string },
  ) {
    const parsed = parseSaleOrderMultipart(body, files);
    const result = await this.saveWithClient.execute({
      ...parsed,
      saleOrderId,
      userId: user.id,
    });

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

  @Get("editor-catalogs")
  getSaleOrderEditorCatalogs(@Query("companyId") companyId?: string) {
    return this.getEditorCatalogs.execute({ companyId });
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

  @Get("export-columns")
  getExportColumns() {
    return this.exportExcel.getAvailableColumns();
  }

  @Get("export-presets")
  async getExportPresets(@CurrentUser() user: { id: string }) {
    const state = await this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: "sale-orders:export",
    });
    return state.metrics;
  }

  @Post("export-presets")
  saveExportPreset(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; columns: Array<{ key: string; label: string }>; useDateRange?: boolean },
  ) {
    return this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: "sale-orders:export",
      name: body.name,
      snapshot: {
        q: "",
        filters: [],
        ...(body as any),
      } as any,
    });
  }

  @Delete("export-presets/:metricId")
  deleteExportPreset(
    @CurrentUser() user: { id: string },
    @Param("metricId", ParseUUIDPipe) metricId: string,
  ) {
    return this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: "sale-orders:export",
      metricId,
    });
  }

  @Post("export-excel")
  @RequirePermissions("sale_orders.export")
  async exportOrdersExcel(
    @Body() dto: HttpExportSaleOrdersDto,
    @Res() res: Response,
  ) {
    const file = await this.exportExcel.execute({
      columns: dto.columns,
      q: dto.q,
      filters: dto.filters,
      useDateRange: dto.useDateRange,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.content);
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
