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

  beforeEach(async () => {
    listSaleOrders.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    getStatistics.execute.mockResolvedValue({ byWorkflow: [], byState: [], byClientType: [], totals: {} });
    getSearchState.execute.mockResolvedValue({ recent: [], saved: [], catalogs: { paymentStatuses: [] } });
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
    advanceSaleOrderState.execute.mockResolvedValue({ id: "x", currentStateId: "state-2" });
    assignWorkflow.execute.mockResolvedValue({ id: "x", workflowId: "workflow-1", currentStateId: "state-1" });
    getAvailableTransitions.execute.mockResolvedValue([]);
    getOrderTimeline.execute.mockResolvedValue([]);
    automaticWorkflow.evaluateAndNotify.mockResolvedValue({ updated: 0, failed: 0, saleOrderIds: [] });

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
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(CompanyConfiguredGuard)
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

  it("evaluates automatic workflow after creating a sale order", async () => {
    const createSaleOrder = app.get(CreateSaleOrderUsecase) as { execute: jest.Mock };
    createSaleOrder.execute.mockResolvedValueOnce({ orderId: "11111111-1111-4111-8111-111111111111" });

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
      "11111111-1111-4111-8111-111111111111",
      SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_CREATED,
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

  it("evaluates automatic workflow after updating a sale order", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    updateSaleOrder.execute.mockResolvedValueOnce({ orderId: saleOrderId });

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
  });

  it("forwards order id to get usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}`).expect(200);
    expect(getSaleOrder.execute).toHaveBeenCalledWith({ saleOrderId });
  });

  it("advances state through a workflow transition", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    const transitionId = "22222222-2222-4222-8222-222222222222";

    await request(app.getHttpServer())
      .post(`/sale-orders/${saleOrderId}/change-state`)
      .send({ transitionId, metadata: { source: "ux" } })
      .expect(201);

    expect(advanceSaleOrderState.execute).toHaveBeenCalledWith({
      saleOrderId,
      transitionId,
      metadata: { source: "ux" },
      executedBy: "user-1",
    });
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
      expect.objectContaining({ saleOrderIds: [saleOrderId] }),
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
      expect.objectContaining({ saleOrderIds: [saleOrderId] }),
    );
  });
});
