import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { HttpSaleOrderCreateDto } from 'src/modules/sale-orders/adapters/in/dtos/http-sale-order-create.dto';
import { CreateSaleOrderUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/create.usecase';
import { HttpListSaleOrdersQueryDto } from 'src/modules/sale-orders/adapters/in/dtos/http-sale-order-list.dto';
import { ListSaleOrdersUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/list.usecase';
import { GetSaleOrderComponentsUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/get-components.usecase';
import { GetSaleOrderItemComponentsUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/get-item-components.usecase';
import { HttpSaleOrderUpdateDto } from 'src/modules/sale-orders/adapters/in/dtos/http-sale-order-update.dto';
import { UpdateSaleOrderUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/update.usecase';
import { BulkAssignSaleOrdersUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/bulk-assign.usecase';
import { BulkChangeSaleOrderStateUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/bulk-change-state.usecase';
import { BulkExecuteSaleOrderWorkflowUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/bulk-execute-workflow.usecase';
import { GetSaleOrderUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/get.usecase';
import { GetSaleOrderSearchStateUsecase } from 'src/modules/sale-orders/application/usecases/sale-order-search/get-state.usecase';
import { SaveSaleOrderSearchMetricUsecase } from 'src/modules/sale-orders/application/usecases/sale-order-search/save-metric.usecase';
import { DeleteSaleOrderSearchMetricUsecase } from 'src/modules/sale-orders/application/usecases/sale-order-search/delete-metric.usecase';
import { HttpCreateSaleOrderSearchMetricDto } from 'src/modules/sale-orders/adapters/in/dtos/http-sale-order-search-metric-create.dto';
import { sanitizeSaleOrderSearchSnapshot } from 'src/modules/sale-orders/application/support/sale-order-search.utils';
import { CancelSaleOrderUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/cancel.usecase';
import { SaleOrdersRealtimeService } from 'src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service';
import { AddSaleOrderPaymentUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase';
import { DeleteSaleOrderPaymentUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase';
import { ListSaleOrderPaymentsUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase';
import { AddSaleOrderPaymentDto } from '../dtos/add-sale-order-payment.dto';
import { ConfirmSaleOrderDeliveryUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase';
import { CreateFromImportPreviewUseCase } from 'src/modules/sale-orders/application/usecases/sale-order/create-from-import-preview.usecase';
import { ListImportLotesUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/list-import-lotes.usecase';
import { SetImportLoteActiveUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/set-import-lote-active.usecase';
import { ListImportLoteAuditUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/list-import-lote-audit.usecase';
import { SetSaleOrdersActiveUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/set-sale-orders-active.usecase';
import { ListSaleOrderAuditUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/list-sale-order-audit.usecase';
import { CreateSaleOrdersFromImportPreviewInput } from 'src/modules/sale-orders/application/dtos/import-preview/create-sale-orders-from-preview.input';
import { AdvanceSaleOrderStateUseCase } from 'src/modules/workflow/application/usecases/advance-sale-order-state.usecase';
import { ChangeSaleOrderStateDto } from '../dtos/change-sale-order-state.dto';
import { AssignSaleOrderWorkflowUseCase } from 'src/modules/workflow/application/usecases/assign-sale-order-workflow.usecase';
import { GetAvailableTransitionsUseCase } from 'src/modules/workflow/application/usecases/get-available-transitions.usecase';
import { GetOrderTimelineUseCase } from 'src/modules/workflow/application/usecases/get-order-timeline.usecase';
import { AssignWorkflowDto } from '../dtos/assign-workflow.dto';
import { GetSaleOrderStatisticsUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/get-statistics.usecase';
import { HttpSaleOrderStatisticsQueryDto } from '../dtos/http-sale-order-statistics.dto';
import {
  SaleOrderAutomaticWorkflowService,
  SaleOrderAutomaticWorkflowTriggerEnum,
} from 'src/modules/sale-orders/application/services/sale-order-automatic-workflow.service';
import { SaleOrderRealtimePayloadService } from 'src/modules/sale-orders/application/services/sale-order-realtime-payload.service';
import { SaveSaleOrderWithClientUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/save-with-client.usecase';
import { parseSaleOrderMultipart } from '../support/sale-order-multipart.parser';
import { BulkAssignSaleOrdersDto } from '../dtos/bulk-assign-sale-orders.dto';
import { BulkChangeSaleOrderStateDto } from '../dtos/bulk-change-sale-order-state.dto';
import { BulkExecuteSaleOrderWorkflowDto } from '../dtos/bulk-execute-sale-order-workflow.dto';
import { ExportSaleOrdersExcelUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/export-excel.usecase';
import { GetSaleOrderEditorCatalogsUsecase } from 'src/modules/sale-orders/application/usecases/sale-order/get-editor-catalogs.usecase';
import { HttpExportSaleOrdersDto } from '../dtos/http-export-sale-orders.dto';
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from 'src/shared/listing-search/domain/listing-search.repository';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import {
  RequireAnyPermissionGroups,
  RequireDynamicPermissionGroups,
} from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { SaleOrderPackMatcherService } from 'src/modules/sale-orders/application/services/sale-order-pack-matcher.service';
import { HttpSaleOrderMatchPackDto } from '../dtos/http-sale-order-match-pack.dto';
import { SaleOrderSkuRecognitionCodeService } from 'src/modules/sale-orders/application/services/sale-order-sku-recognition-code.service';
import {
  CreateSaleOrderSkuRecognitionCodeDto,
  ListSaleOrderSkuRecognitionCodesDto,
  UpdateSaleOrderSkuRecognitionCodeDto,
} from '../dtos/sale-order-sku-recognition-code.dto';

@Controller('sale-orders')
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
    private readonly bulkExecuteSaleOrderWorkflow: BulkExecuteSaleOrderWorkflowUsecase,
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
    private readonly listImportLotes: ListImportLotesUsecase,
    private readonly setImportLoteActive: SetImportLoteActiveUsecase,
    private readonly listImportLoteAudit: ListImportLoteAuditUsecase,
    private readonly setSaleOrdersActive: SetSaleOrdersActiveUsecase,
    private readonly listSaleOrderAudit: ListSaleOrderAuditUsecase,
    private readonly realtimeService: SaleOrdersRealtimeService,
    private readonly automaticWorkflow: SaleOrderAutomaticWorkflowService,
    private readonly realtimePayload: SaleOrderRealtimePayloadService,
    private readonly saveWithClient: SaveSaleOrderWithClientUsecase,
    private readonly exportExcel: ExportSaleOrdersExcelUsecase,
    private readonly getEditorCatalogs: GetSaleOrderEditorCatalogsUsecase,
    private readonly packMatcher: SaleOrderPackMatcherService,
    private readonly skuRecognitionCodes: SaleOrderSkuRecognitionCodeService,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
  ) {}

  private async notifySaleOrderUpdated(
    saleOrderId: string,
    source: string,
    saleOrder?: unknown,
  ) {
    const saleOrders = await this.notifySaleOrdersUpdated(
      [saleOrderId],
      source,
    );
    return saleOrders[0] ?? saleOrder;
  }

  private async notifySaleOrdersUpdated(
    saleOrderIds: string[],
    source: string,
  ) {
    const payload = await this.realtimePayload.build({
      updated: saleOrderIds.length || 1,
      saleOrderIds,
      source,
    });
    this.realtimeService.emitToAllConnected('sale-orders.updated', payload);

    return [];
  }

  private getSuccessfulSaleOrderIds(result: {
    data?: { results?: Array<{ saleOrderId: string; status: string }> };
  }) {
    return (result.data?.results ?? [])
      .filter((row) => row.status === 'success')
      .map((row) => row.saleOrderId);
  }

  private getChangedSaleOrderIds(result: {
    data?: {
      results?: Array<{
        saleOrderId: string;
        completedTransitions?: unknown[];
      }>;
    };
  }) {
    return (result.data?.results ?? [])
      .filter((row) => (row.completedTransitions?.length ?? 0) > 0)
      .map((row) => row.saleOrderId);
  }

  private async evaluateAutomaticWorkflowThenNotify(
    saleOrderId: string,
    trigger: SaleOrderAutomaticWorkflowTriggerEnum,
  ) {
    const result = await this.automaticWorkflow.evaluateAndNotify(
      saleOrderId,
      trigger,
    );
    if (!result.updated) {
      await this.notifySaleOrderUpdated(saleOrderId, trigger);
    }
    return result;
  }

  @Post()
  @RequirePermissions('sale_orders.create')
  async create(
    @Body() dto: HttpSaleOrderCreateDto,
    @CurrentUser() user: { id: string },
  ) {
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
          packNameSnapshot: item.packNameSnapshot,
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
        supplies: dto.supplies?.map((supply) => ({
          supplySkuId: supply.supplySkuId,
          quantity: supply.quantity,
          unitId: supply.unitId,
          referenceRecipeItemId: supply.referenceRecipeItemId,
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

  @Post('with-client')
  @RequirePermissions('sale_orders.create')
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

  @Post('products/match-pack')
  @RequireAnyPermissionGroups(['sale_orders.create'], ['sale_orders.update'])
  async matchProductPack(@Body() dto: HttpSaleOrderMatchPackDto) {
    const result = await this.packMatcher.match(dto.components);
    const matches = result.matches.map((match) => ({
      id: match.pack.packId.value,
      description: match.pack.description,
      total: Number(match.pack.total ?? 0),
    }));

    if (result.status !== 'UNIQUE') {
      return {
        status: result.status,
        composition: result.composition,
        matches,
      };
    }

    return {
      status: result.status,
      composition: result.composition,
      matches,
      pack: {
        id: result.pack.pack.packId.value,
        description: result.pack.pack.description,
        total: Number(result.pack.pack.total ?? 0),
        components: result.pack.items.map((item) => ({
          id: item.id,
          skuId: item.skuId,
          quantity: Number(item.quantity ?? 0),
          price: Number(item.price ?? 0),
          lineTotal: Number(item.lineTotal ?? 0),
        })),
      },
    };
  }

  @Post('import-preview')
  @RequirePermissions('sale_orders.import')
  async createFromPreview(
    @Body()
    dto:
      | CreateSaleOrdersFromImportPreviewInput
      | CreateSaleOrdersFromImportPreviewInput['rows'],
    @CurrentUser() user: { id: string },
  ) {
    const rows = Array.isArray(dto) ? dto : (dto.rows ?? []);

    const result = await this.createFromImportPreview.execute({
      rows,
      userId: user.id,
    });

    const importedSaleOrderIds = (result.rows ?? [])
      .map(
        (row: { saleOrderId?: string; id?: string }) =>
          row.saleOrderId ?? row.id,
      )
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

    if (result.lote) {
      this.realtimeService.emitToAllConnected('sale-order-lotes.updated', {
        lote: result.lote,
        saleOrderIds: importedSaleOrderIds,
        source: 'sale-order-import-created',
      });
    }

    return result;
  }

  @Patch('bulk/assigned-by')
  @RequirePermissions('sale_orders.assign_adviser')
  async bulkAssignBy(@Body() dto: BulkAssignSaleOrdersDto) {
    const result = await this.bulkAssignSaleOrders.execute({
      saleOrderIds: dto.saleOrderIds,
      assignedBy: dto.assignedBy ?? null,
    });

    const successfulIds = this.getSuccessfulSaleOrderIds(result);
    if (successfulIds.length) {
      await this.notifySaleOrdersUpdated(
        successfulIds,
        'sale-orders-bulk-assigned-by',
      );
    }

    return result;
  }

  @Post('bulk/change-state')
  @RequirePermissions('sale_orders.change_state')
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
        'sale-orders-bulk-target-state',
      );
    }

    return result;
  }

  @Post('bulk/execute-workflow')
  @RequireDynamicPermissionGroups(({ body }) => [
    [
      body?.mode === 'global_action'
        ? 'sale_orders.execute_workflow_action'
        : 'sale_orders.change_state',
    ],
  ])
  async bulkExecuteWorkflow(
    @Body() body: BulkExecuteSaleOrderWorkflowDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.bulkExecuteSaleOrderWorkflow.execute({
      saleOrderIds: body.saleOrderIds,
      mode: body.mode,
      targetStateId: body.targetStateId,
      transitionId: body.transitionId,
      globalActionName: body.globalActionName,
      executedBy: user.id,
    });

    const changedSaleOrderIds =
      body.mode === 'state'
        ? this.getChangedSaleOrderIds(result)
        : (result.data?.results ?? [])
            .filter((row: { status?: string }) => row.status === 'success')
            .map((row: { saleOrderId: string }) => row.saleOrderId);

    if (changedSaleOrderIds.length) {
      await this.notifySaleOrdersUpdated(
        changedSaleOrderIds,
        body.mode === 'state'
          ? 'sale-orders-bulk-target-state'
          : 'sale-orders-bulk-global-action',
      );
    }

    return result;
  }

  @Post(':saleOrderId/change-state')
  @RequirePermissions('sale_orders.change_state')
  async changeState(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
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
      type: 'success',
      message: 'Estado del pedido actualizado correctamente mediante workflow.',
      data: result.order,
      warnings: result.warnings,
    };
  }

  @Post(':saleOrderId/assign-workflow')
  @RequirePermissions('sale_orders.assign_workflow')
  async assignSaleOrderWorkflow(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
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

  @Get(':saleOrderId/available-transitions')
  @RequirePermissions('sale_orders.workflows.view')
  availableTransitions(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
  ) {
    return this.getAvailableTransitions.execute({ saleOrderId });
  }

  @Get(':saleOrderId/history')
  @RequirePermissions('sale_orders.view_history')
  history(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.getOrderTimeline.execute({ saleOrderId });
  }

  @Patch(':saleOrderId/cancel')
  @RequirePermissions('sale_orders.cancel')
  async cancel(@Param('saleOrderId', ParseUUIDPipe) saleOrderId: string) {
    const result = await this.cancelSaleOrder.execute({ saleOrderId });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CANCELLED,
    );
    return result;
  }

  @Patch(':saleOrderId/confirm-delivery')
  @RequirePermissions('sale_orders.confirm_delivery')
  async confirmDeliveryForSaleOrder(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
  ) {
    const result = await this.confirmDelivery.execute({ saleOrderId });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.DELIVERY_CONFIRMED,
    );
    return result;
  }

  @Get(':saleOrderId/payments')
  @RequirePermissions('sale_orders.payments.view')
  listSaleOrderPayments(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
  ) {
    return this.listPayments.execute({ saleOrderId });
  }

  @Post(':saleOrderId/payments')
  @RequirePermissions('sale_orders.payments.create')
  async addSaleOrderPayment(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
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

  @Delete(':saleOrderId/payments/:paymentId')
  @RequirePermissions('sale_orders.payments.delete')
  async deleteSaleOrderPayment(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    const result = await this.deletePayment.execute({ saleOrderId, paymentId });
    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.PAYMENT_DELETED,
    );
    return result;
  }

  @Patch(':id')
  @RequirePermissions('sale_orders.update')
  async update(
    @Param('id', ParseUUIDPipe) saleOrderId: string,
    @Body() dto: HttpSaleOrderUpdateDto,
  ) {
    const result = await this.updateSaleOrder.execute({
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
        packNameSnapshot: item.packNameSnapshot,
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
      supplies: dto.supplies?.map((supply) => ({
        supplySkuId: supply.supplySkuId,
        quantity: supply.quantity,
        unitId: supply.unitId,
        referenceRecipeItemId: supply.referenceRecipeItemId,
      })),
    });

    await this.evaluateAutomaticWorkflowThenNotify(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED,
    );
    return result;
  }

  @Patch(':saleOrderId/with-client')
  @RequirePermissions('sale_orders.update')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { files: 25, fileSize: 15 * 1024 * 1024 },
    }),
  )
  async updateWithClient(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
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
  @RequirePermissions('sale_orders.view')
  list(
    @Query() query: HttpListSaleOrdersQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.listSaleOrders.execute({
      q: query.q,
      filters: query.filters,
      page: query.page,
      limit: query.limit,
      requestedBy: user?.id,
      isActive: query.isActive ?? true,
    });
  }

  @Get('statistics')
  @RequirePermissions('sale_orders.view_statistics')
  statistics(
    @Query() query: HttpSaleOrderStatisticsQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.getSaleOrderStatistics.execute({
      q: query.q,
      filters: query.filters,
      includeCancelled: query.includeCancelled,
      isActive: query.isActive ?? true,
      requestedBy: user.id,
    });
  }

  @Get('items/:itemId/components')
  @RequireAnyPermissionGroups([
    'sale_orders.view_detail',
    'sale_orders.products.view',
  ])
  listItemComponents(@Param('itemId', ParseUUIDPipe) saleOrderItemId: string) {
    return this.getItemComponents.execute({ saleOrderItemId: saleOrderItemId });
  }

  @Get('search-state')
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Get('editor-catalogs')
  @RequireAnyPermissionGroups(['sale_orders.create', 'sale_orders.update'])
  getSaleOrderEditorCatalogs(@Query('companyId') companyId?: string) {
    return this.getEditorCatalogs.execute({ companyId });
  }

  @Get('sku-recognition-codes')
  @RequirePermissions('sale_orders.sku_recognition_codes.view')
  listSkuRecognitionCodes(@Query() query: ListSaleOrderSkuRecognitionCodesDto) {
    return this.skuRecognitionCodes.list(query);
  }

  @Post('sku-recognition-codes')
  @RequirePermissions('sale_orders.sku_recognition_codes.manage')
  createSkuRecognitionCode(
    @Body() body: CreateSaleOrderSkuRecognitionCodeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.skuRecognitionCodes.create({ ...body, userId: user.id });
  }

  @Patch('sku-recognition-codes/:id')
  @RequirePermissions('sale_orders.sku_recognition_codes.manage')
  updateSkuRecognitionCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSaleOrderSkuRecognitionCodeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.skuRecognitionCodes.update(id, { ...body, userId: user.id });
  }

  @Delete('sku-recognition-codes/:id')
  @RequirePermissions('sale_orders.sku_recognition_codes.manage')
  deleteSkuRecognitionCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.skuRecognitionCodes.remove(id, user.id);
  }

  @Get('import-lotes')
  @RequirePermissions('sale_orders.import_lotes.view')
  listSaleOrderImportLotes() {
    return this.listImportLotes.execute();
  }

  @Patch('import-lotes/:loteId/active')
  @RequirePermissions('sale_orders.import_lotes.manage')
  async setSaleOrderImportLoteActive(
    @Param('loteId', ParseUUIDPipe) loteId: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.setImportLoteActive.execute({
      loteId,
      isActive: Boolean(body?.isActive),
      executedBy: user.id,
    });

    this.realtimeService.emitToAllConnected('sale-order-lotes.updated', {
      ...result,
      source: result.lote.isActive
        ? 'sale-order-import-lote-restored'
        : 'sale-order-import-lote-deleted',
    });

    if (result.saleOrderIds.length) {
      await this.notifySaleOrdersUpdated(
        result.saleOrderIds,
        result.lote.isActive
          ? 'sale-order-import-lote-restored'
          : 'sale-order-import-lote-deleted',
      );
    }

    return result.lote;
  }

  @Get('import-lotes/:loteId/audit')
  @RequirePermissions('sale_orders.import_lotes.view')
  listSaleOrderImportLoteAudit(@Param('loteId', ParseUUIDPipe) loteId: string) {
    return this.listImportLoteAudit.execute(loteId);
  }

  @Patch('bulk/active')
  @RequireDynamicPermissionGroups(({ body }) => {
    const restore = Boolean(body?.isActive);
    return restore
      ? [['sale_orders.view_deleted'], ['sale_orders.restore']]
      : [['sale_orders.delete']];
  })
  async bulkSetSaleOrdersActive(
    @Body() body: { saleOrderIds?: string[]; isActive: boolean },
    @CurrentUser() user: { id: string },
  ) {
    const isActive = Boolean(body?.isActive);
    const result = await this.setSaleOrdersActive.execute({
      saleOrderIds: body?.saleOrderIds ?? [],
      isActive,
      executedBy: user.id,
    });
    const saleOrderIds = this.getSuccessfulSaleOrderIds(result);
    if (saleOrderIds.length) {
      await this.notifySaleOrdersUpdated(
        saleOrderIds,
        isActive ? 'sale-orders-bulk-restored' : 'sale-orders-bulk-deleted',
      );
    }
    return result;
  }

  @Patch(':saleOrderId/active')
  @RequireDynamicPermissionGroups(({ body }) =>
    Boolean(body?.isActive)
      ? [['sale_orders.view_deleted'], ['sale_orders.restore']]
      : [['sale_orders.delete']],
  )
  async setSaleOrderActive(
    @Param('saleOrderId', ParseUUIDPipe) saleOrderId: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: { id: string },
  ) {
    const isActive = Boolean(body?.isActive);
    const result = await this.setSaleOrdersActive.execute({
      saleOrderIds: [saleOrderId],
      isActive,
      executedBy: user.id,
    });
    const saleOrderIds = this.getSuccessfulSaleOrderIds(result);
    if (saleOrderIds.length) {
      await this.notifySaleOrdersUpdated(
        saleOrderIds,
        isActive ? 'sale-order-restored' : 'sale-order-deleted',
      );
    }
    return result;
  }

  @Get(':saleOrderId/audit')
  @RequirePermissions('sale_orders.view_audit')
  getSaleOrderAudit(@Param('saleOrderId', ParseUUIDPipe) saleOrderId: string) {
    return this.listSaleOrderAudit.execute(saleOrderId);
  }

  @Post('search-metrics')
  saveMetric(
    @Body() dto: HttpCreateSaleOrderSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeSaleOrderSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete('search-metrics/:metricId')
  deleteMetric(
    @Param('metricId', ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @Get('export-columns')
  @RequirePermissions('sale_orders.export')
  getExportColumns() {
    return this.exportExcel.getAvailableColumns();
  }

  @Get('export-presets')
  @RequirePermissions('sale_orders.export')
  async getExportPresets(@CurrentUser() user: { id: string }) {
    const state = await this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: 'sale-orders:export',
    });
    return state.metrics;
  }

  @Post('export-presets')
  @RequirePermissions('sale_orders.export')
  saveExportPreset(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      name: string;
      columns: Array<{ key: string; label: string }>;
      useDateRange?: boolean;
    },
  ) {
    return this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: 'sale-orders:export',
      name: body.name,
      snapshot: {
        q: '',
        filters: [],
        ...(body as any),
      } as any,
    });
  }

  @Delete('export-presets/:metricId')
  @RequirePermissions('sale_orders.export')
  deleteExportPreset(
    @CurrentUser() user: { id: string },
    @Param('metricId', ParseUUIDPipe) metricId: string,
  ) {
    return this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: 'sale-orders:export',
      metricId,
    });
  }

  @Post('export-excel')
  @RequirePermissions('sale_orders.export')
  async exportOrdersExcel(
    @Body() dto: HttpExportSaleOrdersDto,
    @Res() res: Response,
    @CurrentUser() user: { id: string },
  ) {
    const file = await this.exportExcel.execute({
      columns: dto.columns,
      q: dto.q,
      filters: dto.filters,
      useDateRange: dto.useDateRange,
      requestedBy: user.id,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return res.status(200).send(file.content);
  }

  @Get(':id/components')
  @RequireAnyPermissionGroups(
    ['sale_orders.view_detail'],
    ['sale_orders.products.view'],
  )
  listComponents(@Param('id', ParseUUIDPipe) saleOrderId: string) {
    return this.getComponents.execute({ saleOrderId });
  }

  @Get(':id')
  @RequirePermissions('sale_orders.view_detail')
  getById(
    @Param('id', ParseUUIDPipe) saleOrderId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.getSaleOrder.execute({ saleOrderId, requestedBy: user.id });
  }
}
