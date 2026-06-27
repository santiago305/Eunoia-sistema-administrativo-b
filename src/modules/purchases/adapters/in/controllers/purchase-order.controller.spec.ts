import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { ConfirmPurchaseReceptionUsecase } from "src/modules/purchases/application/usecases/purchase-order/confirm-reception.usecase";
import { ExportPurchaseOrdersExcelUsecase } from "src/modules/purchases/application/usecases/purchase-order/export-excel.usecase";
import { PurchaseOrderExpectedScheduler } from "src/modules/purchases/application/jobs/purchase-order-expected-scheduler";
import { PurchaseProcessingApprovalEntity } from "../../out/persistence/typeorm/entities/purchase-processing-approval.entity";
import { ApprovalRequestEntity } from "../../out/persistence/typeorm/entities/approval-request.entity";
import { PurchaseHistoryEventEntity } from "../../out/persistence/typeorm/entities/purchase-history-event.entity";
import { PURCHASE_ORDER } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreatePurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/create.usecase";
import { UpdatePurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/update.usecase";
import { ListPurchaseOrdersUsecase } from "src/modules/purchases/application/usecases/purchase-order/list.usecase";
import { GetPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/get-by-id.usecase";
import { SetPurchaseOrderActiveUsecase } from "src/modules/purchases/application/usecases/purchase-order/set-active.usecase";
import { ListPurchaseOrderItemsUsecase } from "src/modules/purchases/application/usecases/purchase-order-item/list.usecase";
import { RemovePurchaseOrderItemUsecase } from "src/modules/purchases/application/usecases/purchase-order-item/remove.usecase";
import { RunExpectedAtUsecase } from "src/modules/purchases/application/usecases/purchase-order/run-expected-at.usecase";
import { SetSentPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/set-sent.usecase";
import { CancelPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/cancel.usecase";
import { GetPurchaseOrderSearchStateUsecase } from "src/modules/purchases/application/usecases/purchase-search/get-state.usecase";
import { SavePurchaseOrderSearchMetricUsecase } from "src/modules/purchases/application/usecases/purchase-search/save-metric.usecase";
import { DeletePurchaseOrderSearchMetricUsecase } from "src/modules/purchases/application/usecases/purchase-search/delete-metric.usecase";
import { PurchaseOrdersController } from "./purchase-order.controller";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { UploadPurchaseAttachmentUsecase } from "src/modules/purchase-attachments/application/usecases/upload-purchase-attachment.usecase";
import { ListPurchaseAttachmentsUsecase } from "src/modules/purchase-attachments/application/usecases/list-purchase-attachments.usecase";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";

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

describe("PurchaseOrdersController", () => {
  let app: INestApplication;
  const listOrders = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };
  const purchaseRepo = { findById: jest.fn(), update: jest.fn() };
  const uploadAttachment = { execute: jest.fn() };
  const listAttachments = { execute: jest.fn() };
  const purchaseHistoryRepository = { createQueryBuilder: jest.fn(), create: jest.fn(), save: jest.fn() };
  const entityManager = { getRepository: jest.fn() };
  const accessControlService = {
    userHasAllPermissions: jest.fn().mockResolvedValue(true),
    getUserIdsWithPermission: jest.fn().mockResolvedValue(["user-2"]),
  };

  beforeEach(async () => {
    listOrders.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    purchaseRepo.findById.mockResolvedValue(null);
    purchaseRepo.update.mockResolvedValue(null);
    uploadAttachment.execute.mockReset();
    listAttachments.execute.mockReset();
    listAttachments.execute.mockResolvedValue([]);
    purchaseHistoryRepository.createQueryBuilder.mockReset();
    purchaseHistoryRepository.create.mockReset();
    purchaseHistoryRepository.save.mockReset();
    entityManager.getRepository.mockReset();
    accessControlService.userHasAllPermissions.mockResolvedValue(true);
    accessControlService.getUserIdsWithPermission.mockResolvedValue(["user-2"]);
    getSearchState.execute.mockResolvedValue({
      recent: [],
      metrics: [],
      catalogs: {
        suppliers: [],
        warehouses: [],
        statuses: [],
        documentTypes: [],
        paymentForms: [],
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [
        { provide: CreatePurchaseOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdatePurchaseOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: ListPurchaseOrdersUsecase, useValue: listOrders },
        { provide: GetPurchaseOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: SetPurchaseOrderActiveUsecase, useValue: { execute: jest.fn() } },
        { provide: ListPurchaseOrderItemsUsecase, useValue: { execute: jest.fn() } },
        { provide: RemovePurchaseOrderItemUsecase, useValue: { execute: jest.fn() } },
        { provide: RunExpectedAtUsecase, useValue: { execute: jest.fn() } },
        { provide: SetSentPurchaseOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: CancelPurchaseOrderUsecase, useValue: { execute: jest.fn() } },
        { provide: GetPurchaseOrderSearchStateUsecase, useValue: getSearchState },
        { provide: SavePurchaseOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeletePurchaseOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: ExportPurchaseOrdersExcelUsecase, useValue: { execute: jest.fn(), getAvailableColumns: jest.fn().mockReturnValue([]) } },
        { provide: ConfirmPurchaseReceptionUsecase, useValue: { execute: jest.fn() } },
        { provide: UploadPurchaseAttachmentUsecase, useValue: uploadAttachment },
        { provide: ListPurchaseAttachmentsUsecase, useValue: listAttachments },
        { provide: PURCHASE_ORDER, useValue: purchaseRepo },
        { provide: LISTING_SEARCH_STORAGE, useValue: { listState: jest.fn().mockResolvedValue({ metrics: [] }), createMetric: jest.fn(), deleteMetric: jest.fn() } },
        { provide: PurchaseOrderExpectedScheduler, useValue: { schedule: jest.fn() } },
        { provide: IMAGE_PROCESSOR, useValue: { toWebp: jest.fn() } },
        { provide: FILE_STORAGE, useValue: { save: jest.fn(), delete: jest.fn() } },
        { provide: NotificationsService, useValue: { createNotificationForUsers: jest.fn() } },
        { provide: getRepositoryToken(PurchaseProcessingApprovalEntity), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(ApprovalRequestEntity), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(PurchaseHistoryEventEntity), useValue: purchaseHistoryRepository },
        { provide: EntityManager, useValue: entityManager },
        { provide: AccessControlService, useValue: accessControlService },
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

  it("returns the current purchases search-state shape", async () => {
    const response = await request(app.getHttpServer())
      .get("/purchases/orders/search-state")
      .expect(200);

    expect(response.body.catalogs).toEqual(
      expect.objectContaining({
        suppliers: expect.any(Array),
        warehouses: expect.any(Array),
        statuses: expect.any(Array),
        documentTypes: expect.any(Array),
        paymentForms: expect.any(Array),
      }),
    );
    expect(getSearchState.execute).toHaveBeenCalledWith("user-1");
  });

  it("returns a dedicated purchase history search-state shape", async () => {
    getSearchState.execute.mockResolvedValueOnce({
      recent: [],
      saved: [],
      catalogs: {
        suppliers: [],
        statuses: [],
        events: [{ id: "PROCESSING_REQUESTED", label: "Procesamiento solicitado" }],
        users: [{ id: "user-1", label: "Ana Lopez" }],
      },
    });

    const response = await request(app.getHttpServer())
      .get("/purchases/orders/history/search-state")
      .expect(200);

    expect(response.body.catalogs).toEqual(
      expect.objectContaining({
        suppliers: expect.any(Array),
        statuses: expect.any(Array),
        events: expect.any(Array),
        users: expect.any(Array),
      }),
    );
    expect(getSearchState.execute).toHaveBeenCalledWith("user-1", "purchase-history");
  });

  it("parses smart-search filters and forwards them to the list usecase", async () => {
    await request(app.getHttpServer())
      .get("/purchases/orders")
      .query({
        filters: JSON.stringify([
          { field: "waitTime", operator: "in", values: ["IN_PROGRESS"] },
          { field: "dateIssue", operator: "between", range: { start: "2026-04-01", end: "2026-04-10" } },
        ]),
      })
      .expect(200);

    expect(listOrders.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user-1",
        filters: [
          { field: "dateIssue", operator: "between", range: { start: "2026-04-01", end: "2026-04-10" } },
          { field: "waitTime", operator: "in", mode: "include", values: ["IN_PROGRESS"] },
        ],
      }),
    );
  });

  it("returns a paginated purchase timeline with user display names", async () => {
    const poId = "11111111-1111-4111-8111-111111111111";
    const actorId = "22222222-2222-4222-8222-222222222222";
    const event = {
      id: "33333333-3333-4333-8333-333333333333",
      purchaseId: poId,
      eventType: "PAYMENT_APPROVED",
      description: "Pago aprobado.",
      oldValues: null,
      newValues: null,
      metadata: {},
      performedByUserId: actorId,
      targetUserId: null,
      approvalRequestId: null,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    };
    const qb = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[event], 7]),
    };
    purchaseRepo.findById.mockResolvedValue({ poId, createdBy: "user-1" });
    purchaseHistoryRepository.createQueryBuilder.mockReturnValue(qb);
    entityManager.getRepository.mockReturnValue({
      find: jest.fn().mockResolvedValue([{ id: actorId, name: "Ana Lopez", email: "ana@example.com" }]),
    });

    const response = await request(app.getHttpServer())
      .get(`/purchases/orders/${poId}/history`)
      .query({ page: "2", limit: "3" })
      .expect(200);

    expect(qb.skip).toHaveBeenCalledWith(3);
    expect(qb.take).toHaveBeenCalledWith(3);
    expect(response.body).toEqual({
      purchaseId: poId,
      events: [
        expect.objectContaining({
          eventType: "PAYMENT_APPROVED",
          performedByUserName: "Ana Lopez",
        }),
      ],
      total: 7,
      page: 2,
      limit: 3,
      totalPages: 3,
      hasPrev: true,
      hasNext: true,
    });
  });

  it("rejects a second product photo for the same purchase", async () => {
    const poId = "11111111-1111-4111-8111-111111111111";
    purchaseRepo.findById.mockResolvedValue({
      poId,
      serie: "OC",
      correlative: 18,
      imageProdution: [],
    });
    listAttachments.execute.mockResolvedValue([
      {
        attachmentId: "attachment-1",
        purchaseId: poId,
        type: PurchaseAttachmentType.PRODUCT_PHOTO,
        url: "purchase-attachments/purchase-1/products.webp",
      },
    ]);
    uploadAttachment.execute.mockResolvedValue({
      attachmentId: "attachment-2",
      url: "purchase-attachments/purchase-1/products-2.webp",
    });

    const response = await request(app.getHttpServer())
      .patch(`/purchases/orders/${poId}/image-prodution`)
      .attach("file", Buffer.from("image"), {
        filename: "products.png",
        contentType: "image/png",
      })
      .expect(400);

    expect(response.body.message).toContain("La compra ya cuenta con evidencia cargada");
    expect(listAttachments.execute).toHaveBeenCalledWith({
      purchaseId: poId,
      type: PurchaseAttachmentType.PRODUCT_PHOTO,
    });
    expect(uploadAttachment.execute).not.toHaveBeenCalled();
  });
});
