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
import { UpdateSaleOrderStatusUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update-status.usecase";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { NotificationRealtimeService } from "src/modules/mail/infrastructure/realtime/notification-realtime.service";
import { AddSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase";
import { DeleteSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase";
import { ListSaleOrderPaymentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase";
import { ConfirmSaleOrderDeliveryUsecase } from "src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase";

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
  const realtimeService = { emitToAllConnected: jest.fn() };

  beforeEach(async () => {
    listSaleOrders.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    getSearchState.execute.mockResolvedValue({ recent: [], saved: [], catalogs: { paymentStatuses: [] } });
    getComponents.execute.mockResolvedValue({ saleOrderId: "x", items: [] });
    getItemComponents.execute.mockResolvedValue({ saleOrderItemId: "x", components: [] });
    updateSaleOrder.execute.mockResolvedValue({ orderId: "x" });
    getSaleOrder.execute.mockResolvedValue({ id: "x", items: [], payments: [], totalPaid: 0, pendingAmount: 0, paymentStatus: "PENDING" });
    cancelSaleOrder.execute.mockResolvedValue({ saleOrderId: "x", agendaStatus: "CANCELED", deliveryStatus: "CANCELED" });
    confirmDelivery.execute.mockResolvedValue({ saleOrderId: "x", deliveryStatus: "DELIVERED" });
    addPayment.execute.mockResolvedValue({ paymentId: "p1" });
    deletePayment.execute.mockResolvedValue({ deleted: true });
    listPayments.execute.mockResolvedValue([{ id: "p1" }]);

    const moduleRef = await Test.createTestingModule({
      controllers: [SaleOrdersController],
      providers: [
        { provide: CreateSaleOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: ListSaleOrdersUsecase, useValue: listSaleOrders },
        { provide: GetSaleOrderUsecase, useValue: getSaleOrder },
        { provide: GetSaleOrderComponentsUsecase, useValue: getComponents },
        { provide: GetSaleOrderItemComponentsUsecase, useValue: getItemComponents },
        { provide: UpdateSaleOrderUsecase, useValue: updateSaleOrder },
        { provide: GetSaleOrderSearchStateUsecase, useValue: getSearchState },
        { provide: SaveSaleOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteSaleOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdateSaleOrderStatusUsecase, useValue: { execute: jest.fn() } },
        { provide: CancelSaleOrderUsecase, useValue: cancelSaleOrder },
        { provide: ConfirmSaleOrderDeliveryUsecase, useValue: confirmDelivery },
        { provide: AddSaleOrderPaymentUsecase, useValue: addPayment },
        { provide: DeleteSaleOrderPaymentUsecase, useValue: deletePayment },
        { provide: ListSaleOrderPaymentsUsecase, useValue: listPayments },
        { provide: NotificationRealtimeService, useValue: realtimeService },
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
    expect(getItemComponents.execute).toHaveBeenCalledWith({ saleOrderId: saleOrderItemId });
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

  it("forwards order id to get usecase", async () => {
    const saleOrderId = "11111111-1111-4111-8111-111111111111";
    await request(app.getHttpServer()).get(`/sale-orders/${saleOrderId}`).expect(200);
    expect(getSaleOrder.execute).toHaveBeenCalledWith({ saleOrderId });
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
