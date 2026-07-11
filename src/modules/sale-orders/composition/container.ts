import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_SEARCH } from "src/modules/sale-orders/domain/ports/sale-order-search.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo";
import { SaleOrderSearchTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-search.typeorm.repo";
import { SaleOrderItemTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item.typeorm.repo";
import { SaleOrderItemComponentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item-component.typeorm.repo";
import { SalePaymentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-payment.typeorm.repo";
import { CreateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/create.usecase";
import { GetSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get.usecase";
import { ListSaleOrdersUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list.usecase";
import { GetSaleOrderComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-components.usecase";
import { GetSaleOrderItemComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-item-components.usecase";
import { UpdateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update.usecase";
import { BulkAssignSaleOrdersUsecase } from "../application/usecases/sale-order/bulk-assign.usecase";
import { BulkChangeSaleOrderStateUsecase } from "../application/usecases/sale-order/bulk-change-state.usecase";
import { GetSaleOrderSearchStateUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/get-state.usecase";
import { SaveSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/save-metric.usecase";
import { DeleteSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/delete-metric.usecase";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { SaleOrdersJobsScheduler } from "src/modules/sale-orders/infrastructure/jobs/sale-orders-jobs.scheduler";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { ConfirmSaleOrderDeliveryUsecase } from "src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase";
import { ListSaleOrderPaymentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase";
import { AddSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase";
import { DeleteSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase";
import { CreateFromImportPreviewUseCase } from "src/modules/sale-orders/application/usecases/sale-order/create-from-import-preview.usecase";
import { SaleOrderImportClientResolverService } from "src/modules/sale-orders/application/services/sale-order-import-client-resolver.service";
import { SaleOrderImportRowNormalizerService } from "src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service";
import { SaleOrderImportSkuResolverService } from "src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service";
import { SaleOrderImportSourceResolverService } from "src/modules/sale-orders/application/services/sale-order-import-source-resolver.service";
import { CreateClientUsecase } from "src/modules/clients/application/usecases/client/create.usecase";
import { CreateSourceUsecase } from "src/modules/sources/application/usecases/source/create.usecase";
import { SaleOrderWorkflowTransitionService } from "src/modules/workflow/application/services/sale-order-workflow-transition.service";
import { SaleOrderWorkflowContextService } from "src/modules/workflow/application/services/sale-order-workflow-context.service";
import { AdvanceSaleOrderStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-state.usecase";
import { AdvanceSaleOrderToTargetStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-to-target-state.usecase";
import { AssignSaleOrderWorkflowUseCase } from "src/modules/workflow/application/usecases/assign-sale-order-workflow.usecase";
import { GetAvailableTransitionsUseCase } from "src/modules/workflow/application/usecases/get-available-transitions.usecase";
import { GetOrderTimelineUseCase } from "src/modules/workflow/application/usecases/get-order-timeline.usecase";
import { SaleOrderStockRequirementsService } from "src/modules/workflow/application/services/sale-order-stock-requirements.service";
import { SaleOrderWorkflowActionRunnerService } from "src/modules/workflow/application/services/sale-order-workflow-action-runner.service";
import { GetSaleOrderStatisticsUsecase } from "../application/usecases/sale-order/get-statistics.usecase";
import { SaleOrderNumberingService } from "../application/services/sale-order-numbering.service";
import { SaleOrderStockConsumptionService } from "src/modules/workflow/application/services/sale-order-stock-consumption.service";
import { RunAutomaticWorkflowTransitionsJob } from "src/modules/workflow/application/jobs/run-automatic-workflow-transitions.job";
import { SaleOrdersGateway } from "src/modules/sale-orders/adapters/in/websocket/sale-orders.gateway";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { SaleOrderAutomaticWorkflowService } from "src/modules/sale-orders/application/services/sale-order-automatic-workflow.service";
import { WorkflowReactivityGateway } from "src/modules/sale-orders/adapters/in/websocket/workflow-reactivity.gateway";
import { WorkflowReactivityRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/workflow-reactivity-realtime.service";
import { WorkflowReactivityOrchestratorService } from "src/modules/sale-orders/application/services/workflow-reactivity-orchestrator.service";
import { SaleOrderRealtimePayloadService } from "src/modules/sale-orders/application/services/sale-order-realtime-payload.service";
import { SaleOrderWarehouseAssignmentService } from "src/modules/workflow/application/services/sale-order-warehouse-assignment.service";
import { SaleOrderEditPolicyService } from "../application/services/sale-order-edit-policy.service";
import { UpdateClientUsecase } from "src/modules/clients/application/usecases/client/update.usecase";
import { SaleOrderClientCommandService } from "../application/services/sale-order-client-command.service";
import { SaleOrderPaymentReconcilerService } from "../application/services/sale-order-payment-reconciler.service";
import { SaveSaleOrderWithClientUsecase } from "../application/usecases/sale-order/save-with-client.usecase";
import { ExportSaleOrdersExcelUsecase } from "../application/usecases/sale-order/export-excel.usecase";

export const saleOrdersModuleProviders = [
  { provide: SALE_ORDER_REPOSITORY, useClass: SaleOrderTypeormRepository },
  { provide: SALE_ORDER_ITEM_REPOSITORY, useClass: SaleOrderItemTypeormRepository },
  { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useClass: SaleOrderItemComponentTypeormRepository },
  { provide: SALE_PAYMENT_REPOSITORY, useClass: SalePaymentTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: SALE_ORDER_SEARCH, useClass: SaleOrderSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
  CreateSaleOrderUsecase,
  SaleOrderNumberingService,
  SaleOrderEditPolicyService,
  GetSaleOrderUsecase,
  UpdateSaleOrderUsecase,
  BulkAssignSaleOrdersUsecase,
  BulkChangeSaleOrderStateUsecase,
  ListSaleOrdersUsecase,
  GetSaleOrderStatisticsUsecase,
  CancelSaleOrderUsecase,
  ConfirmSaleOrderDeliveryUsecase,
  ListSaleOrderPaymentsUsecase,
  AddSaleOrderPaymentUsecase,
  DeleteSaleOrderPaymentUsecase,
  CreateFromImportPreviewUseCase,
  SaleOrderWorkflowContextService,
  SaleOrderWorkflowTransitionService,
  AdvanceSaleOrderStateUseCase,
  AdvanceSaleOrderToTargetStateUseCase,
  AssignSaleOrderWorkflowUseCase,
  GetAvailableTransitionsUseCase,
  GetOrderTimelineUseCase,
  SaleOrderStockRequirementsService,
  SaleOrderWorkflowActionRunnerService,
  SaleOrderWarehouseAssignmentService,
  SaleOrderStockConsumptionService,
  SaleOrderImportClientResolverService,
  SaleOrderImportRowNormalizerService,
  SaleOrderImportSkuResolverService,
  SaleOrderImportSourceResolverService,
  CreateClientUsecase,
  UpdateClientUsecase,
  SaleOrderClientCommandService,
  SaleOrderPaymentReconcilerService,
  SaveSaleOrderWithClientUsecase,
  ExportSaleOrdersExcelUsecase,
  CreateSourceUsecase,
  GetSaleOrderComponentsUsecase,
  GetSaleOrderItemComponentsUsecase,
  GetSaleOrderSearchStateUsecase,
  SaveSaleOrderSearchMetricUsecase,
  DeleteSaleOrderSearchMetricUsecase,
  RunAutomaticWorkflowTransitionsJob,
  SaleOrderRealtimePayloadService,
  SaleOrdersRealtimeService,
  SaleOrdersGateway,
  SaleOrderAutomaticWorkflowService,
  WorkflowReactivityRealtimeService,
  WorkflowReactivityGateway,
  WorkflowReactivityOrchestratorService,
  SaleOrdersJobsScheduler,
];
