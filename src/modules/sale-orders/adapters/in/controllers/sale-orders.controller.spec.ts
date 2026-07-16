import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { SaleOrdersController } from "./sale-orders.controller";
import { CreateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/create.usecase";
import { ListSaleOrdersUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list.usecase";
import { GetSaleOrderComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-components.usecase";
import { GetSaleOrderItemComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-item-components.usecase";
import { UpdateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update.usecase";
import { GetSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get.usecase";
import { GetSaleOrderSearchStateUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/get-state.usecase";
import { SaveSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/save-metric.usecase";
import { DeleteSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/delete-metric.usecase";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { AddSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase";
import { DeleteSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase";
import { ListSaleOrderPaymentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase";
import { ConfirmSaleOrderDeliveryUsecase } from "src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase";
import { CreateFromImportPreviewUseCase } from "src/modules/sale-orders/application/usecases/sale-order/create-from-import-preview.usecase";
import { AdvanceSaleOrderStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-state.usecase";
import { AssignSaleOrderWorkflowUseCase } from "src/modules/workflow/application/usecases/assign-sale-order-workflow.usecase";
import { GetAvailableTransitionsUseCase } from "src/modules/workflow/application/usecases/get-available-transitions.usecase";
import { GetOrderTimelineUseCase } from "src/modules/workflow/application/usecases/get-order-timeline.usecase";
import { GetSaleOrderStatisticsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-statistics.usecase";
import {
  SaleOrderAutomaticWorkflowService,
  SaleOrderAutomaticWorkflowTriggerEnum,
} from "src/modules/sale-orders/application/services/sale-order-automatic-workflow.service";
import { SaleOrderRealtimePayloadService } from "src/modules/sale-orders/application/services/sale-order-realtime-payload.service";
import { SaveSaleOrderWithClientUsecase } from "src/modules/sale-orders/application/usecases/sale-order/save-with-client.usecase";
import { BulkAssignSaleOrdersUsecase } from "src/modules/sale-orders/application/usecases/sale-order/bulk-assign.usecase";
import { BulkChangeSaleOrderStateUsecase } from "src/modules/sale-orders/application/usecases/sale-order/bulk-change-state.usecase";
import { ExportSaleOrdersExcelUsecase } from "src/modules/sale-orders/application/usecases/sale-order/export-excel.usecase";
import { GetSaleOrderEditorCatalogsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-editor-catalogs.usecase";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";

@Injectable()
class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { id: "user-1" };
    return true;
  }
}

@Injectable()
class AllowGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe("SaleOrdersController", () => {
  let app: INestApplication;
  const listSaleOrders = { execute: jest.fn() };
  const getStatistics = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };
  const getComponents = { execute: jest.fn() };
  const getItemComponents = { execute: jest.fn() };
  const updateSaleOrder = { execute: jest.fn() };
  const getSaleOrder = { execute: jest.fn() };
  const cancelSaleOrder = { execute: jest.fn() };
  const confirmDelivery = { execute: jest.fn() };
  const addPayment = { execute: jest.fn() };
  const deletePayment = { execute: jest.fn() };
  const listPayments = { execute: jest.fn() };
  const createFromImportPreview = { execute: jest.fn() };
  const advanceSaleOrderState = { execute: jest.fn() };
  const assignWorkflow = { execute: jest.fn() };
  const getAvailableTransitions = { execute: jest.fn() };
  const getOrderTimeline = { execute: jest.fn() };
  const realtimeService = { emitToAllConnected: jest.fn() };
  const automaticWorkflow = { evaluateAndNotify: jest.fn() };
  const realtimePayload = { build: jest.fn() };
  const saveWithClient = { execute: jest.fn() };
  const bulkAssignSaleOrders = { execute: jest.fn() };
  const bulkChangeSaleOrderState = { execute: jest.fn() };
  const editorCatalogs = { execute: jest.fn() };
  const exportExcel = {
    getAvailableColumns: jest.fn(),
    execute: jest.fn(),
  };
  const listingSearchStorage = {
    listState: jest.fn(),
    createMetric: jest.fn(),
    deleteMetric: jest.fn(),
  };
  const statisticsPayload = {
    byWorkflow: [],
    byState: [],
    byClientType: [],
    byBankAccount: [],
    totals: { orders: 1, total: 120, collected: 10, pending: 110, deliveryCostSum: 0 },
  };

  beforeEach(async () => {
    listSaleOrders.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    getStatistics.execute.mockResolvedValue(statisticsPayload);
    getSearchState.execute.mockResolvedValue({ recent: [], saved: [], catalogs: { paymentStatuses: [] } });
    editorCatalogs.execute.mockResolvedValue({
      clients: [],
      warehouses: [],
      subsidiaries: [],
      sources: [],
      workflows: [],
      advisers: [],
      paymentMethods: [],
      companyPaymentAccounts: [],
    });
    getComponents.execute.mockResolvedValue({ saleOrderId: "x", items: [] });
    getItemComponents.execute.mockResolvedValue({ saleOrderItemId: "x", components: [] });
    updateSaleOrder.execute.mockResolvedValue({ orderId: "x" });
    getSaleOrder.execute.mockResolvedValue({ id: "x", items: [], payments: [], totalPaid: 0, pendingAmount: 0, paymentStatus: "PENDING" });
    cancelSaleOrder.execute.mockResolvedValue({ saleOrderId: "x", currentStateId: "state-cancelled" });
    confirmDelivery.execute.mockResolvedValue({ saleOrderId: "x", currentStateId: "state-delivered" });
    addPayment.execute.mockResolvedValue({ paymentId: "p1" });
    deletePayment.execute.mockResolvedValue({ deleted: true });
    listPayments.execute.mockResolvedValue([{ id: "p1" }]);
    createFromImportPreview.execute.mockResolvedValue({ importedRows: 1, failedRows: 0, rows: [], errors: [] });
    advanceSaleOrderState.execute.mockResolvedValue({
      order: { id: "x", currentStateId: "state-2" },
      warnings: [],
      actionOutcomes: [],
    });
    assignWorkflow.execute.mockResolvedValue({ id: "x", workflowId: "workflow-1", currentStateId: "state-1" });
    getAvailableTransitions.execute.mockResolvedValue([]);
    getOrderTimeline.execute.mockResolvedValue([]);
    automaticWorkflow.evaluateAndNotify.mockResolvedValue({ updated: 0, failed: 0, saleOrderIds: [] });
    bulkAssignSaleOrders.execute.mockResolvedValue({
      type: "success",
      message: "Operacion masiva procesada",
      data: {
        requested: 2,
        succeeded: 2,
        failed: 0,
        results: [
          { saleOrderId: "11111111-1111-4111-8111-111111111111", status: "success" },
          { saleOrderId: "22222222-2222-4222-8222-222222222222", status: "success" },
        ],
      },
    });
    bulkChangeSaleOrderState.execute.mockResolvedValue({
      type: "success",
      message: "Operacion masiva procesada",
      data: {
        targetStateId: "33333333-3333-4333-8333-333333333333",
        requested: 2,
        succeeded: 1,
        failed: 1,
        partiallyCompleted: 1,
        results: [
          {
            saleOrderId: "11111111-1111-4111-8111-111111111111",
            targetStateId: "33333333-3333-4333-8333-333333333333",
            status: "success",
            initialState: { workflowStateId: "state-1", saleOrderStateId: "global-created", code: "CREATED", name: "Creado" },
            finalState: { workflowStateId: "state-2", saleOrderStateId: "global-packed", code: "PACKED", name: "Empacado" },
            completedTransitions: [{ transitionId: "transition-1" }],
            warnings: ["w1"],
          },
          {
            saleOrderId: "22222222-2222-4222-8222-222222222222",
            targetStateId: "33333333-3333-4333-8333-333333333333",
            status: "failed",
            message: "El DNI del cliente es obligatorio",
            initialState: { workflowStateId: "state-1", saleOrderStateId: "global-created", code: "CREATED", name: "Creado" },
            finalState: { workflowStateId: "state-2", saleOrderStateId: "global-packed", code: "PACKED", name: "Empacado" },
            completedTransitions: [{ transitionId: "transition-2" }],
            warnings: [],
            failure: { code: "CONDITION_FAILED", message: "El DNI del cliente es obligatorio" },
          },
        ],
      },
    });
    exportExcel.getAvailableColumns.mockReturnValue([{ key: "number", label: "Numero" }]);
    exportExcel.execute.mockResolvedValue({
      filename: "pedidos-2026-07-09.xlsx",
      content: Buffer.from("excel"),
    });
    listingSearchStorage.listState.mockResolvedValue({
      metrics: [{ metricId: "metric-1", name: "Basico", snapshot: { columns: [{ key: "number", label: "Numero" }] } }],
    });
    listingSearchStorage.createMetric.mockResolvedValue({ metricId: "metric-1" });
    listingSearchStorage.deleteMetric.mockResolvedValue(true);
    saveWithClient.execute.mockResolvedValue({
      orderId: "11111111-1111-4111-8111-111111111111",
      clientId: "33333333-3333-4333-8333-333333333333",
    });
    realtimePayload.build.mockImplementation(async (input: {
      updated?: number;
      saleOrderIds: string[];
      source: string;
      trigger?: string;
    }) => {
      const saleOrders = (
        await Promise.all(
          input.saleOrderIds.map((saleOrderId) =>
            getSaleOrder.execute({ saleOrderId }).catch(() => undefined),
          ),
        )
      ).filter((saleOrder): saleOrder is NonNullable<typeof saleOrder> => Boolean(saleOrder));

      return {
        updated: input.updated ?? input.saleOrderIds.length,
        saleOrderIds: input.saleOrderIds,
        source: input.source,
        ...(input.trigger ? { trigger: input.trigger } : {}),
        ...(saleOrders.length ? { saleOrders } : {}),
        statistics: await getStatistics.execute({}),
      };
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [SaleOrdersController],
      providers: [
        { provide: CreateSaleOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: ListSaleOrdersUsecase, useValue: listSaleOrders },
        { provide: GetSaleOrderStatisticsUsecase, useValue: getStatistics },
        { provide: GetSaleOrderUsecase, useValue: getSaleOrder },
        { provide: GetSaleOrderComponentsUsecase, useValue: getComponents },
        { provide: GetSaleOrderItemComponentsUsecase, useValue: getItemComponents },
        { provide: UpdateSaleOrderUsecase, useValue: updateSaleOrder },
        { provide: BulkAssignSaleOrdersUsecase, useValue: bulkAssignSaleOrders },
        { provide: BulkChangeSaleOrderStateUsecase, useValue: bulkChangeSaleOrderState },
        { provide: GetSaleOrderEditorCatalogsUsecase, useValue: editorCatalogs },
        { provide: ExportSaleOrdersExcelUsecase, useValue: exportExcel },
        { provide: LISTING_SEARCH_STORAGE, useValue: listingSearchStorage },
        { provide: GetSaleOrderSearchStateUsecase, useValue: getSearchState },
        { provide: SaveSaleOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteSaleOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: AdvanceSaleOrderStateUseCase, useValue: advanceSaleOrderState },
        { provide: AssignSaleOrderWorkflowUseCase, useValue: assignWorkflow },
        { provide: GetAvailableTransitionsUseCase, useValue: getAvailableTransitions },
        { provide: GetOrderTimelineUseCase, useValue: getOrderTimeline },
        { provide: CancelSaleOrderUsecase, useValue: cancelSaleOrder },
        { provide: ConfirmSaleOrderDeliveryUsecase, useValue: confirmDelivery },
        { provide: AddSaleOrderPaymentUsecase, useValue: addPayment },
        { provide: DeleteSaleOrderPaymentUsecase, useValue: deletePayment },
        { provide: ListSaleOrderPaymentsUsecase, useValue: listPayments },
        { provide: CreateFromImportPreviewUseCase, useValue: createFromImportPreview },
        { provide: SaleOrdersRealtimeService, useValue: realtimeService },
        { provide: SaleOrderAutomaticWorkflowService, useValue: automaticWorkflow },
        { provide: SaleOrderRealtimePayloadService, useValue: realtimePayload },
        { provide: SaveSaleOrderWithClientUsecase, useValue: saveWithClient },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(CompanyConfiguredGuard)
      .useClass(AllowGuard)
      .overrideGuard(PermissionsGuard)
      .useClass(AllowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it("parses q/page/limit/filters and forwards to list usecase", async () => {
    await request(app.getHttpServer())
      .get("/sale-orders")
      .query({
        q: "S01",
        page: "2",
        limit: "20",
        filters: JSON.stringify([{ field: "paymentStatus", operator: "in", values: ["PAID"] }]),
      })
      .expect(200);

    expect(listSaleOrders.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "S01",
        page: 2,
        limit: 20,
        requestedBy: "user-1",
        filters: [{ field: "paymentStatus", operator: "in", values: ["PAID"] }],
      }),
    );
  });

  it("forwards import preview rows with current user", async () => {
    await request(app.getHttpServer())
      .post("/sale-orders/import-preview")
      .send({ rows: [{ total: 120 }] })
      .expect(201);

    expect(createFromImportPreview.execute).toHaveBeenCalledWith({
      rows: [{ total: 120 }],
      userId: "user-1",
    });
  });

  it("emits imported sale orders with currentState in the websocket payload", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    createFromImportPreview.execute.mockResolvedValueOnce({
      importedRows: 1,
      failedRows: 0,
      rows: [{ saleOrderId }],
      errors: [],
    });
    getSaleOrder.execute.mockResolvedValueOnce({
      id: saleOrderId,
      currentState: { code: "WAITING", name: "Esperando" },
      items: [],
      payments: [],
      totalPaid: 0,
      pendingAmount: 0,
      paymentStatus: "PENDING",
    });

    await request(app.getHttpServer())
      .post("/sale-orders/import-preview")
      .send({ rows: [{ total: 120 }] })
      .expect(201);

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [saleOrderId],
        saleOrders: [expect.objectContaining({
          id: saleOrderId,
          currentState: expect.objectContaining({ code: "WAITING" }),
        })],
        statistics: statisticsPayload,
      }),
    );
  });

  it("emits realtime and evaluates automatic workflow after creating a sale order", async () => {
    const createSaleOrder = app.get(CreateSaleOrderUsecase) as { execute: jest.Mock };
    createSaleOrder.execute.mockResolvedValueOnce({ orderId: "11111111-1111-4111-8111-111111111111" });
    getSaleOrder.execute.mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111", items: [], payments: [], totalPaid: 0, pendingAmount: 0, paymentStatus: "PENDING" });

    await request(app.getHttpServer())
      .post("/sale-orders")
      .send({
        warehouseId: "22222222-2222-4222-8222-222222222222",
        clientId: "33333333-3333-4333-8333-333333333333",
        workflowId: "44444444-4444-4444-8444-444444444444",
        subTotal: 10,
        total: 10,
        items: [{
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{
            skuId: "55555555-5555-4555-8555-555555555555",
            quantity: 1,
            unitPrice: 10,
            total: 10,
          }],
        }],
      })
      .expect(201);

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
        source: "sale-order-created",
        statistics: statisticsPayload,
      }),
    );
    expect(automaticWorkflow.evaluateAndNotify).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CREATED,
    );
  });

  it("accepts an empty warehouseId when creating a sale order", async () => {
    const createSaleOrder = app.get(CreateSaleOrderUsecase) as { execute: jest.Mock };
    createSaleOrder.execute.mockResolvedValueOnce({ orderId: "11111111-1111-4111-8111-111111111111" });

    await request(app.getHttpServer())
      .post("/sale-orders")
      .send({
        warehouseId: "",
        clientId: "33333333-3333-4333-8333-333333333333",
        workflowId: "44444444-4444-4444-8444-444444444444",
        subTotal: 10,
        total: 10,
        items: [{
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{
            skuId: "55555555-5555-4555-8555-555555555555",
            quantity: 1,
            unitPrice: 10,
            total: 10,
          }],
        }],
      })
      .expect(201);

    expect(createSaleOrder.execute).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: undefined }),
      "user-1",
    );
  });

  it("accepts multipart unified creation and notifies only after save succeeds", async () => {
    const payload = {
      client: {
        mode: "existing",
        id: "33333333-3333-4333-8333-333333333333",
      },
      workflowId: "44444444-4444-4444-8444-444444444444",
      items: [{
        quantity: 1,
        unitPrice: 10,
        total: 10,
        components: [{
          skuId: "55555555-5555-4555-8555-555555555555",
          quantity: 1,
          unitPrice: 10,
          total: 10,
        }],
      }],
      payments: [],
    };

    await request(app.getHttpServer())
      .post("/sale-orders/with-client")
      .field("data", JSON.stringify(payload))
      .attach("shippingPhoto", Buffer.from("image"), {
        filename: "shipping.png",
        contentType: "image/png",
      })
      .expect(201);

    expect(saveWithClient.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        data: payload,
        shippingPhoto: expect.objectContaining({
          fieldname: "shippingPhoto",
          mimetype: "image/png",
        }),
        userId: "user-1",
      }),
    );
    expect(automaticWorkflow.evaluateAndNotify).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CREATED,
    );
  });

  it("does not emit the stale create event when automatic workflow already updated the order", async () => {
    const createSaleOrder = app.get(CreateSaleOrderUsecase) as { execute: jest.Mock };
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    createSaleOrder.execute.mockResolvedValueOnce({ orderId: saleOrderId });
    automaticWorkflow.evaluateAndNotify.mockResolvedValueOnce({
      updated: 1,
      failed: 0,
      saleOrderIds: [saleOrderId],
    });

    await request(app.getHttpServer())
      .post("/sale-orders")
      .send({
        warehouseId: "22222222-2222-4222-8222-222222222222",
        clientId: "33333333-3333-4333-8333-333333333333",
        workflowId: "44444444-4444-4444-8444-444444444444",
        subTotal: 10,
        total: 10,
        items: [{
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{
            skuId: "55555555-5555-4555-8555-555555555555",
            quantity: 1,
            unitPrice: 10,
            total: 10,
          }],
        }],
      })
      .expect(201);

    expect(automaticWorkflow.evaluateAndNotify).toHaveBeenCalledWith(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CREATED,
    );
    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
  });

  it("emits imported sale orders without automatic workflow separately from automatic updates", async () => {
    const automaticSaleOrderId = "11111111-1111-4111-8111-111111111111";
    const unchangedSaleOrderId = "22222222-2222-4222-8222-222222222222";
    createFromImportPreview.execute.mockResolvedValueOnce({
      importedRows: 2,
      failedRows: 0,
      rows: [{ saleOrderId: automaticSaleOrderId }, { saleOrderId: unchangedSaleOrderId }],
      errors: [],
    });
    automaticWorkflow.evaluateAndNotify
      .mockResolvedValueOnce({
        updated: 1,
        failed: 0,
        saleOrderIds: [automaticSaleOrderId],
      })
      .mockResolvedValueOnce({
        updated: 0,
        failed: 0,
        saleOrderIds: [],
      });
    getSaleOrder.execute.mockResolvedValueOnce({
      id: unchangedSaleOrderId,
      currentState: { code: "WAITING", name: "Esperando" },
      items: [],
      payments: [],
      totalPaid: 0,
      pendingAmount: 0,
      paymentStatus: "PENDING",
    });

    await request(app.getHttpServer())
      .post("/sale-orders/import-preview")
      .send({ rows: [{ total: 120 }, { total: 80 }] })
      .expect(201);

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [unchangedSaleOrderId],
        saleOrders: [expect.objectContaining({ id: unchangedSaleOrderId })],
        statistics: statisticsPayload,
      }),
    );
  });

  it("forwards one filtered statistics query", async () => {
    await request(app.getHttpServer())
      .get("/sale-orders/statistics")
      .query({
        q: "S01",
        includeCancelled: "true",
        filters: JSON.stringify([{ field: "workflowId", operator: "in", values: ["workflow-1"] }]),
      })
      .expect(200);

    expect(getStatistics.execute).toHaveBeenCalledWith({
      q: "S01",
      includeCancelled: true,
      filters: [{ field: "workflowId", operator: "in", values: ["workflow-1"] }],
    });
  });

  it("accepts import preview rows as direct array body", async () => {
    await request(app.getHttpServer())
      .post("/sale-orders/import-preview")
      .send([{ total: 120 }])
      .expect(201);

    expect(createFromImportPreview.execute).toHaveBeenCalledWith({
      rows: [{ total: 120 }],
      userId: "user-1",
    });
  });

  it("returns search-state catalogs", async () => {
    const response = await request(app.getHttpServer()).get("/sale-orders/search-state").expect(200);
    expect(response.body).toHaveProperty("catalogs");
  });

  it("returns sale-order editor catalogs in one request", async () => {
    editorCatalogs.execute.mockResolvedValueOnce({
      clients: [{ id: "client-1", fullName: "Cliente Uno", docNumber: "12345678" }],
      warehouses: [{ warehouseId: "warehouse-1", name: "Principal" }],
      subsidiaries: [{ id: "subsidiary-1", alias: "Agencia", address: "Av. 1", basePrice: 8 }],
      sources: [{ id: "source-1", name: "Facebook" }],
      workflows: [{ id: "workflow-1", name: "Venta", isActive: true }],
      advisers: [{ id: "adviser-1", name: "Ana", email: "ana@example.com" }],
      paymentMethods: [{ companyMethodId: "cm-1", methodId: "method-1", name: "EFECTIVO", isActive: true }],
      companyPaymentAccounts: [{ id: "account-1", companyId: "company-1", type: "CASH", name: "Caja", currency: "PEN", isActive: true, isDefault: true }],
    });

    const response = await request(app.getHttpServer())
      .get("/sale-orders/editor-catalogs")
      .query({ companyId: "11111111-1111-4111-8111-111111111111" })
      .expect(200);

    expect(editorCatalogs.execute).toHaveBeenCalledWith({
      companyId: "11111111-1111-4111-8111-111111111111",
    });
    expect(response.body).toEqual(expect.objectContaining({
      clients: [expect.objectContaining({ id: "client-1" })],
      subsidiaries: [expect.objectContaining({ id: "subsidiary-1" })],
      workflows: [expect.objectContaining({ id: "workflow-1" })],
      companyPaymentAccounts: [expect.objectContaining({ id: "account-1" })],
    }));
  });

  it("returns export columns", async () => {
    const response = await request(app.getHttpServer()).get("/sale-orders/export-columns").expect(200);

    expect(response.body).toEqual([{ key: "number", label: "Numero" }]);
    expect(exportExcel.getAvailableColumns).toHaveBeenCalledTimes(1);
  });

  it("uses sale-orders export table key for presets", async () => {
    const response = await request(app.getHttpServer()).get("/sale-orders/export-presets").expect(200);

    expect(response.body).toEqual([
      { metricId: "metric-1", name: "Basico", snapshot: { columns: [{ key: "number", label: "Numero" }] } },
    ]);
    expect(listingSearchStorage.listState).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "sale-orders:export",
    });
  });

  it("stores sale-orders export presets with selected columns", async () => {
    await request(app.getHttpServer())
      .post("/sale-orders/export-presets")
      .send({
        name: "Basico",
        columns: [{ key: "number", label: "Numero" }],
        useDateRange: true,
      })
      .expect(201);

    expect(listingSearchStorage.createMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "sale-orders:export",
      name: "Basico",
      snapshot: {
        q: "",
        filters: [],
        name: "Basico",
        columns: [{ key: "number", label: "Numero" }],
        useDateRange: true,
      },
    });
  });

  it("deletes sale-orders export presets from the export table key", async () => {
    const metricId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer()).delete(`/sale-orders/export-presets/${metricId}`).expect(200);

    expect(listingSearchStorage.deleteMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "sale-orders:export",
      metricId,
    });
  });

  it("exports sale orders as an Excel attachment", async () => {
    const response = await request(app.getHttpServer())
      .post("/sale-orders/export-excel")
      .send({
        columns: [{ key: "number", label: "Numero" }],
        q: "SO",
        filters: [{ field: "createdAt", operator: "between", range: { start: "2026-07-01", end: "2026-07-09" } }],
        useDateRange: true,
      })
      .expect(200);

    expect(response.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="pedidos-2026-07-09.xlsx"');
    expect(exportExcel.execute).toHaveBeenCalledWith({
      columns: [{ key: "number", label: "Numero" }],
      q: "SO",
      filters: [{ field: "createdAt", operator: "between", range: { start: "2026-07-01", end: "2026-07-09" } }],
      useDateRange: true,
    });
  });

  it("forwards order id to components usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}/components`).expect(200);
    expect(getComponents.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("forwards item id to item components usecase", async () => {
    const saleOrderItemId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).get(`/sale-orders/items/${saleOrderItemId}/components`).expect(200);
    expect(getItemComponents.execute).toHaveBeenCalledWith({ saleOrderItemId });
  });

  it("forwards payload to update usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer())
      .patch(`/sale-orders/${saleOrderId}`)
      .send({
        warehouseId: "22222222-2222-4222-8222-222222222222",
        clientId: "33333333-3333-4333-8333-333333333333",
        items: [{ quantity: 1, unitPrice: 10, total: 10, components: [{ skuId: "44444444-4444-4444-8444-444444444444", quantity: 1, unitPrice: 10, total: 10 }] }],
      })
      .expect(200);

    expect(updateSaleOrder.execute).toHaveBeenCalledWith(expect.objectContaining({ saleOrderId }));
  });

  it("emits realtime and evaluates automatic workflow after updating a sale order", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    updateSaleOrder.execute.mockResolvedValueOnce({ orderId: saleOrderId });
    getSaleOrder.execute.mockResolvedValueOnce({ id: saleOrderId, items: [], payments: [], totalPaid: 0, pendingAmount: 0, paymentStatus: "PENDING" });

    await request(app.getHttpServer())
      .patch(`/sale-orders/${saleOrderId}`)
      .send({
        warehouseId: "22222222-2222-4222-8222-222222222222",
        clientId: "33333333-3333-4333-8333-333333333333",
        items: [{
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{
            skuId: "44444444-4444-4444-8444-444444444444",
            quantity: 1,
            unitPrice: 10,
            total: 10,
          }],
        }],
      })
      .expect(200);

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [saleOrderId],
        source: "sale-order-updated",
        saleOrders: [expect.objectContaining({ id: saleOrderId })],
        statistics: statisticsPayload,
      }),
    );
    expect(automaticWorkflow.evaluateAndNotify).toHaveBeenCalledWith(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED,
    );
  });

  it("does not emit the stale update event when automatic workflow already updated the order", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    updateSaleOrder.execute.mockResolvedValueOnce({ orderId: saleOrderId });
    automaticWorkflow.evaluateAndNotify.mockResolvedValueOnce({
      updated: 1,
      failed: 0,
      saleOrderIds: [saleOrderId],
    });

    await request(app.getHttpServer())
      .patch(`/sale-orders/${saleOrderId}`)
      .send({
        warehouseId: "22222222-2222-4222-8222-222222222222",
        clientId: "33333333-3333-4333-8333-333333333333",
        items: [{
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{
            skuId: "44444444-4444-4444-8444-444444444444",
            quantity: 1,
            unitPrice: 10,
            total: 10,
          }],
        }],
      })
      .expect(200);

    expect(automaticWorkflow.evaluateAndNotify).toHaveBeenCalledWith(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED,
    );
    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
  });

  it("bulk assigns sale orders and emits one consolidated realtime update", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    const assignedBy = "33333333-3333-4333-8333-333333333333";

    await request(app.getHttpServer())
      .patch("/sale-orders/bulk/assigned-by")
      .send({ saleOrderIds: [firstId, secondId], assignedBy })
      .expect(200);

    expect(bulkAssignSaleOrders.execute).toHaveBeenCalledWith({
      saleOrderIds: [firstId, secondId],
      assignedBy,
    });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [firstId, secondId],
        source: "sale-orders-bulk-assigned-by",
      }),
    );
  });

  it("bulk changes workflow state to one global target and notifies changed rows once", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    const targetStateId = "33333333-3333-4333-8333-333333333333";

    const response = await request(app.getHttpServer())
      .post("/sale-orders/bulk/change-state")
      .send({
        saleOrderIds: [firstId, secondId],
        targetStateId,
      })
      .expect(201);

    expect(bulkChangeSaleOrderState.execute).toHaveBeenCalledWith({
      saleOrderIds: [firstId, secondId],
      targetStateId,
      executedBy: "user-1",
    });
    expect(automaticWorkflow.evaluateAndNotify).not.toHaveBeenCalledWith(
      firstId,
      SaleOrderAutomaticWorkflowTriggerEnum.WORKFLOW_STATE_CHANGED,
    );
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [firstId, secondId],
        source: "sale-orders-bulk-target-state",
      }),
    );
    expect(response.body.data.succeeded).toBe(1);
    expect(response.body.data.partiallyCompleted).toBe(1);
  });

  it("forwards order id to get usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}`).expect(200);
    expect(getSaleOrder.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("advances state through a workflow transition", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    const transitionId = "22222222-2222-4222-8222-222222222222";
    advanceSaleOrderState.execute.mockResolvedValueOnce({
      order: { id: saleOrderId, currentStateId: "state-2" },
      warnings: ["Ya hay un almacén seleccionado"],
      actionOutcomes: [],
    });

    const response = await request(app.getHttpServer())
      .post(`/sale-orders/${saleOrderId}/change-state`)
      .send({ transitionId, metadata: { source: "ux" } })
      .expect(201);

    expect(advanceSaleOrderState.execute).toHaveBeenCalledWith({
      saleOrderId,
      transitionId,
      metadata: { source: "ux" },
      executedBy: "user-1",
    });
    expect(response.body.warnings).toEqual(["Ya hay un almacén seleccionado"]);
    expect(response.body.data).toEqual(expect.objectContaining({ id: saleOrderId }));
  });

  it("assigns a workflow to an order without workflow", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    const workflowId = "22222222-2222-4222-8222-222222222222";

    await request(app.getHttpServer())
      .post(`/sale-orders/${saleOrderId}/assign-workflow`)
      .send({ workflowId })
      .expect(201);

    expect(assignWorkflow.execute).toHaveBeenCalledWith({
      saleOrderId,
      workflowId,
      executedBy: "user-1",
    });
  });

  it("returns evaluated available transitions", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}/available-transitions`).expect(200);

    expect(getAvailableTransitions.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("returns the workflow history timeline", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}/history`).expect(200);

    expect(getOrderTimeline.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("forwards order id to cancel usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).patch(`/sale-orders/${saleOrderId}/cancel`).expect(200);
    expect(cancelSaleOrder.execute).toHaveBeenCalledWith({ saleOrderId });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({ saleOrderIds: [saleOrderId] }),
    );
  });

  it("forwards order id to confirm delivery usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).patch(`/sale-orders/${saleOrderId}/confirm-delivery`).expect(200);
    expect(confirmDelivery.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("lists payments for a saleOrderId", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}/payments`).expect(200);
    expect(listPayments.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("adds payment and emits realtime", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    getSaleOrder.execute.mockResolvedValueOnce({ id: saleOrderId, items: [], payments: [], totalPaid: 0, pendingAmount: 0, paymentStatus: "PENDING" });
    await request(app.getHttpServer())
      .post(`/sale-orders/${saleOrderId}/payments`)
      .send({
        bankAccountId: "22222222-2222-4222-8222-222222222222",
        method: "cash",
        amount: 10,
        date: "2026-05-28T00:00:00.000Z",
        operationNumber: "op-1",
        note: "n",
      })
      .expect(201);

    expect(addPayment.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId,
        bankAccountId: "22222222-2222-4222-8222-222222222222",
        method: "cash",
        amount: 10,
      }),
    );

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [saleOrderId],
        saleOrders: [expect.objectContaining({ id: saleOrderId })],
        statistics: statisticsPayload,
      }),
    );
    expect(automaticWorkflow.evaluateAndNotify).toHaveBeenCalledWith(
      saleOrderId,
      SaleOrderAutomaticWorkflowTriggerEnum.PAYMENT_CREATED,
    );
  });

  it("deletes payment and emits realtime", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    const paymentId = "22222222-2222-4222-8222-222222222222";

    await request(app.getHttpServer()).delete(`/sale-orders/${saleOrderId}/payments/${paymentId}`).expect(200);

    expect(deletePayment.execute).toHaveBeenCalledWith({ saleOrderId, paymentId });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith(
      "sale-orders.updated",
      expect.objectContaining({
        saleOrderIds: [saleOrderId],
        statistics: statisticsPayload,
      }),
    );
  });
});
