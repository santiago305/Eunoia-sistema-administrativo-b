import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreatePurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/create.usecase";
import { UpdatePurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/update.usecase";
import { ListPurchaseOrdersUsecase } from "src/modules/purchases/application/usecases/purchase-order/list.usecase";
import { GetPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/get-by-id.usecase";
import { HttpCreatePurchaseOrderDto } from "../dtos/purchase-order/http-purchase-order-create.dto";
import { HttpUpdatePurchaseOrderDto } from "../dtos/purchase-order/http-purchase-order-update.dto";
import { HttpListPurchaseOrdersQueryDto } from "../dtos/purchase-order/http-purchase-order-list.dto";
import { HttpCreatePurchaseSearchMetricDto } from "../dtos/purchase-order/http-purchase-search-metric-create.dto";
import { HttpExportPurchaseOrdersDto } from "../dtos/purchase-order/http-export-purchase-orders.dto";
import { HttpPurchaseHistoryListQueryDto } from "../dtos/purchase-order/http-purchase-history-list.dto";
import { RunExpectedAtUsecase } from "src/modules/purchases/application/usecases/purchase-order/run-expected-at.usecase";
import { SetSentPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/set-sent.usecase";
import { CancelPurchaseOrderUsecase } from "src/modules/purchases/application/usecases/purchase-order/cancel.usecase";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { PurchaseOrderHttpMapper } from "src/modules/purchases/application/mappers/purchase-order-http.mapper";
import { PurchaseOrderOutputMapper } from "src/modules/purchases/application/mappers/purchase-order-output.mapper";
import { GetPurchaseOrderSearchStateUsecase } from "src/modules/purchases/application/usecases/purchase-search/get-state.usecase";
import { SavePurchaseOrderSearchMetricUsecase } from "src/modules/purchases/application/usecases/purchase-search/save-metric.usecase";
import { DeletePurchaseOrderSearchMetricUsecase } from "src/modules/purchases/application/usecases/purchase-search/delete-metric.usecase";
import { sanitizePurchaseSearchSnapshot } from "src/modules/purchases/application/support/purchase-search.utils";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderExpectedScheduler } from "src/modules/purchases/application/jobs/purchase-order-expected-scheduler";
import { ExportPurchaseOrdersExcelUsecase } from "src/modules/purchases/application/usecases/purchase-order/export-excel.usecase";
import { ConfirmPurchaseReceptionUsecase } from "src/modules/purchases/application/usecases/purchase-order/confirm-reception.usecase";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { IMAGE_PROCESSOR, ImageProcessor } from "src/shared/application/ports/image-processor.port";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { ImageProcessingError } from "src/shared/application/errors/image-processing.error";
import { FileStorageConflictError, InvalidFileStoragePathError } from "src/shared/application/errors/file-storage.errors";
import { NotificationsService } from "src/modules/notifications/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/notifications/domain/constants/purchase-notification-types";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { PurchaseProcessingApprovalEntity } from "../../out/persistence/typeorm/entities/purchase-processing-approval.entity";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { ApprovalRequestEntity } from "../../out/persistence/typeorm/entities/approval-request.entity";
import { PurchaseHistoryEventEntity } from "../../out/persistence/typeorm/entities/purchase-history-event.entity";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PurchaseOrderEntity } from "../../out/persistence/typeorm/entities/purchase-order.entity";

@Controller("purchases/orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly createOrder: CreatePurchaseOrderUsecase,
    private readonly updateOrder: UpdatePurchaseOrderUsecase,
    private readonly listOrders: ListPurchaseOrdersUsecase,
    private readonly getOrder: GetPurchaseOrderUsecase,
    private readonly runExpected: RunExpectedAtUsecase,
    private readonly setSent: SetSentPurchaseOrderUsecase,
    private readonly cancelOrder: CancelPurchaseOrderUsecase,
    private readonly getSearchState: GetPurchaseOrderSearchStateUsecase,
    private readonly saveSearchMetric: SavePurchaseOrderSearchMetricUsecase,
    private readonly deleteSearchMetric: DeletePurchaseOrderSearchMetricUsecase,
    private readonly exportExcel: ExportPurchaseOrdersExcelUsecase,
    private readonly confirmReception: ConfirmPurchaseReceptionUsecase,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
    private readonly scheduler: PurchaseOrderExpectedScheduler,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(PurchaseProcessingApprovalEntity)
    private readonly purchaseApprovalRepository: Repository<PurchaseProcessingApprovalEntity>,
    @InjectRepository(ApprovalRequestEntity)
    private readonly approvalRequestRepository: Repository<ApprovalRequestEntity>,
    @InjectRepository(PurchaseHistoryEventEntity)
    private readonly purchaseHistoryRepository: Repository<PurchaseHistoryEventEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.create")
  async create(@Body() dto: HttpCreatePurchaseOrderDto, @CurrentUser() user: { id: string }) {
    try {
      const canApproveCreationWithPayment = await this.accessControlService.userHasAllPermissions(user.id, [
        "purchases.approve_creation_with_payment",
      ]);
      const requestedPayments = Array.isArray(dto.payments) ? dto.payments.length : 0;
      const requiresApprovalForCreationWithPayment = requestedPayments > 0 && !canApproveCreationWithPayment;
      const result = await this.createOrder.execute(
        PurchaseOrderHttpMapper.toCreateInput(dto),
        user.id,
        {
          allowDirectPaymentCreation: !requiresApprovalForCreationWithPayment,
        },
      );

      if (requiresApprovalForCreationWithPayment) {
        await this.purchaseRepo.update({
          poId: result.order.poId,
          approvalStatus: "PENDING",
        });
        const approvalRequest = this.approvalRequestRepository.create({
          module: "purchases",
          action: "PURCHASE_CREATION_WITH_PAYMENT",
          entityType: "purchase_order",
          entityId: result.order.poId,
          requestedByUserId: user.id,
          status: "PENDING",
          payloadSnapshot: {
            poId: result.order.poId,
            paymentsRequested: requestedPayments,
          },
        });
        const savedApprovalRequest = await this.approvalRequestRepository.save(approvalRequest);

        await this.purchaseHistoryRepository.save(
          this.purchaseHistoryRepository.create({
            purchaseId: result.order.poId,
            eventType: "PURCHASE_CREATED_WITH_PAYMENT_PENDING_APPROVAL",
            description: "La compra fue creada con pagos pendientes de aprobación.",
            metadata: {
              paymentsRequested: requestedPayments,
            },
            performedByUserId: user.id,
            targetUserId: user.id,
            approvalRequestId: savedApprovalRequest.id,
          }),
        );

        const approverIds = await this.accessControlService.getUserIdsWithPermission(
          "purchases.approve_creation_with_payment",
        );
        const filteredApprovers = approverIds.filter((idValue) => idValue !== user.id);
        if (filteredApprovers.length > 0) {
          await this.notificationsService.createNotificationForUsers({
            recipientUserIds: filteredApprovers,
            type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CREATION_WITH_PAYMENT_PENDING,
            category: "PURCHASES",
            title: "Aprobación pendiente de compra con pago",
            message: "Un usuario solicitó crear una compra con pago directo y requiere aprobación.",
            priority: "HIGH",
            actionUrl: `/compras?purchaseId=${result.order.poId}&modal=detail`,
            actionLabel: "Ver compra",
            sourceModule: "purchases",
            sourceEntityType: "purchase_order",
            sourceEntityId: result.order.poId,
            metadata: {
              poId: result.order.poId,
              approvalRequestId: savedApprovalRequest.id,
              showAsToast: true,
            },
            showAsToast: true,
          });
        }
      }

      const silentWatcherPermission = "purchases.receive_created_purchase_notifications";
      const watcherIds = await this.accessControlService.getUserIdsWithPermission(silentWatcherPermission);
      const silentRecipientIds = watcherIds.filter((idValue) => idValue !== user.id);
      if (silentRecipientIds.length > 0) {
        const canViewCreatorIds = await this.accessControlService.getUserIdsWithPermission(
          "purchases.view_creator_info",
        );
        const visibleCreatorRecipients = silentRecipientIds.filter((idValue) => canViewCreatorIds.includes(idValue));
        const genericRecipients = silentRecipientIds.filter((idValue) => !canViewCreatorIds.includes(idValue));

        if (visibleCreatorRecipients.length > 0) {
          await this.notificationsService.createNotificationForUsers({
            recipientUserIds: visibleCreatorRecipients,
            type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CREATED,
            category: "PURCHASES",
            title: "Nueva compra creada",
            message: `El usuario ${user.id} creó una nueva compra.`,
            priority: "LOW",
            sourceModule: "purchases",
            sourceEntityType: "purchase_order",
            sourceEntityId: result.order.poId,
            metadata: { poId: result.order.poId, showAsToast: false },
            showAsToast: false,
          });
        }

        if (genericRecipients.length > 0) {
          await this.notificationsService.createNotificationForUsers({
            recipientUserIds: genericRecipients,
            type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CREATED,
            category: "PURCHASES",
            title: "Nueva compra creada",
            message: "Se creó una nueva compra.",
            priority: "LOW",
            sourceModule: "purchases",
            sourceEntityType: "purchase_order",
            sourceEntityId: result.order.poId,
            metadata: { poId: result.order.poId, showAsToast: false },
            showAsToast: false,
          });
        }
      }

        return {
          type: "success",
          message: requiresApprovalForCreationWithPayment
            ? "Orden de compra creada. Los pagos quedaron pendientes de aprobación."
            : "Orden de compra creada correctamente",
          order: PurchaseOrderOutputMapper.toOrderOutput(result.order),
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
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.process")
  async setSentPurchase(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    const canApproveProcessing = await this.accessControlService.userHasAllPermissions(user.id, [
      "purchases.approve_processing",
    ]);
    if (!canApproveProcessing) {
      throw new ForbiddenException("No tienes permiso para procesar directamente. Debes solicitar aprobación.");
    }
    const order = await this.purchaseRepo.findById(id);
    if (!order) throw new BadRequestException("Orden de compra no encontrada");
    const orderEntity = await this.entityManager.getRepository(PurchaseOrderEntity).findOne({
      where: { id },
      select: ["id", "approvalStatus"],
    });
    if (orderEntity?.approvalStatus === "PENDING") {
      throw new BadRequestException("La compra está pendiente de aprobación y no puede procesarse todavía.");
    }
    if (orderEntity?.approvalStatus === "REJECTED") {
      throw new BadRequestException("La compra fue rechazada y no puede procesarse.");
    }
    return this.setSent.execute(id);
  }

  @Patch(":id/cancel")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.cancel_draft")
  cancel(@Param("id", ParseUUIDPipe) id: string) {
    return this.cancelOrder.execute(id);
  }

  @Post(":id/run-expected")
  runExpectedAt(@Param("id", ParseUUIDPipe) id: string) {
    return this.runExpected.execute(id);
  }

  @Post(":id/request-processing")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.process")
  async requestProcessingApproval(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    const order = await this.purchaseRepo.findById(id);
    if (!order) {
      throw new BadRequestException("Orden de compra no encontrada");
    }
    const orderEntity = await this.entityManager.getRepository(PurchaseOrderEntity).findOne({
      where: { id },
      select: ["id", "approvalStatus"],
    });
    if (orderEntity?.approvalStatus === "PENDING") {
      throw new BadRequestException("La compra está pendiente de aprobación y no puede avanzar de etapa.");
    }
    if (orderEntity?.approvalStatus === "REJECTED") {
      throw new BadRequestException("La compra fue rechazada y no puede procesarse.");
    }
    if (order.status !== "DRAFT") {
      throw new BadRequestException("Solo las compras en borrador pueden solicitar procesamiento.");
    }

    const pending = await this.purchaseApprovalRepository.findOne({
      where: { poId: id, status: "PENDING" },
    });
    if (pending) {
      throw new ConflictException("La compra ya tiene una solicitud pendiente de aprobación");
    }

    const approval = this.purchaseApprovalRepository.create({
      poId: id,
      requestedBy: user.id,
      status: "PENDING",
      reason: body?.reason?.trim() || null,
    });

    const saved = await this.purchaseApprovalRepository.save(approval);

    const approverIds = await this.accessControlService.getUserIdsWithPermission(
      "purchases.approve_processing",
    );
    const recipientIds = approverIds.filter((idValue) => idValue !== user.id);
    await this.purchaseHistoryRepository.save(
      this.purchaseHistoryRepository.create({
        purchaseId: id,
        eventType: "PROCESSING_REQUESTED",
        description: "Se solicitó aprobación para procesar la compra.",
        performedByUserId: user.id,
        targetUserId: null,
        metadata: { reason: saved.reason ?? null },
      }),
    );
    if (recipientIds.length > 0) {
      const purchaseCode = [order.serie, order.correlative].filter(Boolean).join("-") || order.poId.slice(0, 8);
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: recipientIds,
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PROCESSING_REQUESTED,
        category: "PURCHASES",
        title: "Solicitud de aprobación de compra",
        message: `El usuario ${user.id} quiere procesar el pedido ${purchaseCode}.`,
        priority: "HIGH",
        actionUrl: `/compras?purchaseId=${order.poId}&modal=detail`,
        actionLabel: "Ver compra",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: order.poId,
        metadata: {
          poId: order.poId,
          purchaseCode,
          approvalId: saved.id,
          reason: saved.reason ?? null,
        },
      });
    }

    return {
      type: "success",
      message: "Solicitud de aprobación enviada",
      approval: saved,
    };
  }

  @Post(":id/approve-processing")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.approve_processing")
  async approveProcessing(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { comment?: string },
    @CurrentUser() user: { id: string },
  ) {
    const pending = await this.purchaseApprovalRepository.findOne({
      where: { poId: id, status: "PENDING" },
      order: { createdAt: "DESC" },
    });
    if (!pending) {
      throw new BadRequestException("No existe solicitud pendiente para esta compra");
    }

    const result = await this.setSent.execute(id);

    pending.status = "APPROVED";
    pending.reviewedBy = user.id;
    pending.reviewedAt = new Date();
    pending.reviewComment = body?.comment?.trim() || null;
    await this.purchaseApprovalRepository.save(pending);

    await this.notificationsService.createNotificationForUsers({
      recipientUserIds: [pending.requestedBy],
      type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PROCESSING_APPROVED,
      category: "PURCHASES",
      title: "Solicitud aprobada",
      message: "Tu solicitud de procesamiento de compra fue aprobada.",
      priority: "NORMAL",
      actionUrl: `/compras?purchaseId=${id}&modal=detail`,
      actionLabel: "Ver compra",
      sourceModule: "purchases",
      sourceEntityType: "purchase_order",
      sourceEntityId: id,
      metadata: {
        poId: id,
        approvalId: pending.id,
        reviewedBy: user.id,
      },
    });
    await this.purchaseHistoryRepository.save(
      this.purchaseHistoryRepository.create({
        purchaseId: id,
        eventType: "PROCESSING_APPROVED",
        description: "Se aprobó el procesamiento de la compra.",
        performedByUserId: user.id,
        targetUserId: pending.requestedBy,
        metadata: { comment: pending.reviewComment ?? null },
      }),
    );

    return {
      type: "success",
      message: "Compra aprobada y enviada a procesamiento correctamente",
      approval: pending,
      result,
    };
  }

  @Post(":id/approve-creation-with-payment")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.approve_creation_with_payment")
  async approveCreationWithPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    const approval = await this.approvalRequestRepository.findOne({
      where: { entityId: id, action: "PURCHASE_CREATION_WITH_PAYMENT", status: "PENDING" },
      order: { createdAt: "DESC" },
    });
    if (!approval) {
      throw new BadRequestException("No existe solicitud pendiente para creación con pago.");
    }

    await this.entityManager.getRepository(PaymentDocumentEntity).update(
      { poId: id, status: "PENDING_APPROVAL" },
      {
        status: "APPROVED",
        approvedByUserId: user.id,
        approvedAt: new Date(),
      },
    );
    await this.purchaseRepo.update({
      poId: id,
      approvalStatus: "APPROVED",
    });

    approval.status = "APPROVED";
    approval.reviewedByUserId = user.id;
    approval.reviewedAt = new Date();
    await this.approvalRequestRepository.save(approval);

    await this.purchaseHistoryRepository.save(
      this.purchaseHistoryRepository.create({
        purchaseId: id,
        eventType: "PURCHASE_CREATION_APPROVED",
        description: "Se aprobó la creación de compra con pago.",
        performedByUserId: user.id,
        targetUserId: approval.requestedByUserId,
        approvalRequestId: approval.id,
        metadata: {},
      }),
    );

    await this.notificationsService.createNotificationForUsers({
      recipientUserIds: [approval.requestedByUserId],
      type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CREATION_WITH_PAYMENT_APPROVED,
      category: "PURCHASES",
      title: "Compra aprobada",
      message: "Tu compra con pago fue aprobada.",
      priority: "NORMAL",
      actionUrl: `/compras?purchaseId=${id}&modal=detail`,
      actionLabel: "Ver compra",
      sourceModule: "purchases",
      sourceEntityType: "purchase_order",
      sourceEntityId: id,
      metadata: { poId: id, approvalRequestId: approval.id, showAsToast: true },
      showAsToast: true,
    });

    return { type: "success", message: "Creación de compra con pago aprobada." };
  }

  @Post(":id/reject-creation-with-payment")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.approve_creation_with_payment")
  async rejectCreationWithPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    const approval = await this.approvalRequestRepository.findOne({
      where: { entityId: id, action: "PURCHASE_CREATION_WITH_PAYMENT", status: "PENDING" },
      order: { createdAt: "DESC" },
    });
    if (!approval) {
      throw new BadRequestException("No existe solicitud pendiente para creación con pago.");
    }

    const reason = body?.reason?.trim() || null;
    await this.entityManager.getRepository(PaymentDocumentEntity).update(
      { poId: id, status: "PENDING_APPROVAL" },
      {
        status: "REJECTED",
        rejectedByUserId: user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    );
    await this.purchaseRepo.update({
      poId: id,
      approvalStatus: "REJECTED",
    });

    approval.status = "REJECTED";
    approval.reviewedByUserId = user.id;
    approval.reviewedAt = new Date();
    approval.reason = reason;
    await this.approvalRequestRepository.save(approval);

    await this.purchaseHistoryRepository.save(
      this.purchaseHistoryRepository.create({
        purchaseId: id,
        eventType: "PURCHASE_CREATION_REJECTED",
        description: "Se rechazó la creación de compra con pago.",
        performedByUserId: user.id,
        targetUserId: approval.requestedByUserId,
        approvalRequestId: approval.id,
        metadata: { reason },
      }),
    );

    await this.notificationsService.createNotificationForUsers({
      recipientUserIds: [approval.requestedByUserId],
      type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CREATION_WITH_PAYMENT_REJECTED,
      category: "PURCHASES",
      title: "Compra rechazada",
      message: "Tu compra con pago fue rechazada.",
      priority: "NORMAL",
      actionUrl: `/compras?purchaseId=${id}&modal=detail`,
      actionLabel: "Ver detalle",
      sourceModule: "purchases",
      sourceEntityType: "purchase_order",
      sourceEntityId: id,
      metadata: { poId: id, approvalRequestId: approval.id, reason, showAsToast: true },
      showAsToast: true,
    });

    return { type: "success", message: "Creación de compra con pago rechazada." };
  }

  @Post(":id/reject-processing")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.approve_processing")
  async rejectProcessing(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { comment?: string },
    @CurrentUser() user: { id: string },
  ) {
    const pending = await this.purchaseApprovalRepository.findOne({
      where: { poId: id, status: "PENDING" },
      order: { createdAt: "DESC" },
    });
    if (!pending) {
      throw new BadRequestException("No existe solicitud pendiente para esta compra");
    }

    pending.status = "REJECTED";
    pending.reviewedBy = user.id;
    pending.reviewedAt = new Date();
    pending.reviewComment = body?.comment?.trim() || null;
    await this.purchaseApprovalRepository.save(pending);

    await this.notificationsService.createNotificationForUsers({
      recipientUserIds: [pending.requestedBy],
      type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PROCESSING_REJECTED,
      category: "PURCHASES",
      title: "Solicitud rechazada",
      message: "Tu solicitud de procesamiento de compra fue rechazada.",
      priority: "NORMAL",
      actionUrl: `/compras?purchaseId=${id}&modal=detail`,
      actionLabel: "Ver detalle",
      sourceModule: "purchases",
      sourceEntityType: "purchase_order",
      sourceEntityId: id,
      metadata: {
        poId: id,
        approvalId: pending.id,
        reviewedBy: user.id,
        comment: pending.reviewComment ?? null,
      },
    });
    await this.purchaseHistoryRepository.save(
      this.purchaseHistoryRepository.create({
        purchaseId: id,
        eventType: "PROCESSING_REJECTED",
        description: "Se rechazó el procesamiento de la compra.",
        performedByUserId: user.id,
        targetUserId: pending.requestedBy,
        metadata: { comment: pending.reviewComment ?? null },
      }),
    );

    return {
      type: "success",
      message: "Solicitud rechazada",
      approval: pending,
    };
  }

  @Post(":id/confirm-reception")
  confirmPurchaseReception(@Param("id", ParseUUIDPipe) id: string) {
    return this.confirmReception.execute(id);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.view")
  list(@Query() query: HttpListPurchaseOrdersQueryDto, @CurrentUser() user: { id: string }) {
    return this.listOrders.execute(PurchaseOrderHttpMapper.toListInput({
      status: query.status,
      statuses: query.statuses,
      supplierId: query.supplierId,
      supplierIds: query.supplierIds,
      warehouseId: query.warehouseId,
      warehouseIds: query.warehouseIds,
      documentType: query.documentType,
      documentTypes: query.documentTypes,
      paymentForms: query.paymentForms,
      number: query.number,
      q: query.q,
      filters: query.filters,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
      requestedBy: user?.id,
    }));
  }

  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Post("search-metrics")
  saveMetric(
    @Body() dto: HttpCreatePurchaseSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizePurchaseSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("search-metrics/:metricId")
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
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
      tableKey: "purchase-orders:export",
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
      tableKey: "purchase-orders:export",
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
      tableKey: "purchase-orders:export",
      metricId,
    });
  }

  @Post("export-excel")
  async exportOrdersExcel(
    @Body() dto: HttpExportPurchaseOrdersDto,
    @Res() res: Response,
  ) {
    const file = await this.exportExcel.execute({
      columns: dto.columns,
      q: dto.q,
      filters: dto.filters,
      from: dto.from,
      to: dto.to,
      useDateRange: dto.useDateRange,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.content);
  }

  @Get("history")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.view_history")
  async listHistory(
    @Query() query: HttpListPurchaseOrdersQueryDto,
    @Query("eventType") eventType: string | undefined,
    @Query("eventFrom") eventFrom: string | undefined,
    @Query("eventTo") eventTo: string | undefined,
    @Query("performedByUserId") performedByUserId: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    let purchaseIdsWhitelist: string[] | undefined;
    if (eventType || eventFrom || eventTo || performedByUserId) {
      const eventQb = this.purchaseHistoryRepository
        .createQueryBuilder("event")
        .select("DISTINCT event.purchase_id", "purchaseId");

      if (eventType) {
        eventQb.andWhere("event.event_type = :eventType", { eventType });
      }
      if (eventFrom) {
        eventQb.andWhere("event.created_at >= :eventFrom", { eventFrom: new Date(eventFrom) });
      }
      if (eventTo) {
        eventQb.andWhere("event.created_at <= :eventTo", { eventTo: new Date(eventTo) });
      }
      if (performedByUserId) {
        eventQb.andWhere("event.performed_by_user_id = :performedByUserId", {
          performedByUserId,
        });
      }

      const filtered = await eventQb.getRawMany<{ purchaseId: string }>();
      purchaseIdsWhitelist = filtered.map((row) => row.purchaseId).filter(Boolean);
    }

    const base = await this.listOrders.execute(
      PurchaseOrderHttpMapper.toListInput({
        status: query.status,
        statuses: query.statuses,
        supplierId: query.supplierId,
        supplierIds: query.supplierIds,
        warehouseId: query.warehouseId,
        warehouseIds: query.warehouseIds,
        documentType: query.documentType,
        documentTypes: query.documentTypes,
        paymentForms: query.paymentForms,
        number: query.number,
        q: query.q,
        filters: query.filters,
        from: query.from,
        to: query.to,
        page: query.page,
        limit: query.limit,
        requestedBy: user?.id,
        purchaseIdsWhitelist,
      }),
    );

    const purchaseIds = (base.items ?? []).map((item) => item.poId).filter(Boolean);
    const grouped = purchaseIds.length
      ? await this.purchaseHistoryRepository
          .createQueryBuilder("event")
          .select("event.purchase_id", "purchaseId")
          .addSelect("COUNT(event.purchase_history_event_id)", "eventsCount")
          .addSelect("MAX(event.created_at)", "lastEventAt")
          .where("event.purchase_id IN (:...purchaseIds)", { purchaseIds })
          .groupBy("event.purchase_id")
          .getRawMany<{ purchaseId: string; eventsCount: string; lastEventAt: string | null }>()
      : [];

    const summaryMap = new Map(
      grouped.map((row) => [
        row.purchaseId,
        {
          eventsCount: Number(row.eventsCount ?? 0),
          lastEventAt: row.lastEventAt,
        },
      ]),
    );

    return {
      ...base,
      items: (base.items ?? []).map((item) => ({
        ...item,
        history: summaryMap.get(item.poId) ?? {
          eventsCount: 0,
          lastEventAt: null,
        },
      })),
    };
  }

  @Get(":id/history")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.view_history")
  async getPurchaseTimeline(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: HttpPurchaseHistoryListQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    const order = await this.purchaseRepo.findById(id);
    if (!order) {
      throw new BadRequestException("Orden de compra no encontrada");
    }

    const canViewAll = await this.accessControlService.userHasAllPermissions(user.id, ["purchases.view_all"]);
    const canViewOthers = await this.accessControlService.userHasAllPermissions(user.id, ["purchases.view_created_by_others"]);
    if (!canViewAll && !canViewOthers && order.createdBy && order.createdBy !== user.id) {
      throw new ForbiddenException("No tienes permiso para ver historial de compras creadas por otros.");
    }

    const qb = this.purchaseHistoryRepository
      .createQueryBuilder("event")
      .where("event.purchase_id = :purchaseId", { purchaseId: id })
      .orderBy("event.created_at", "ASC");

    if (query.eventType) {
      qb.andWhere("event.event_type = :eventType", { eventType: query.eventType });
    }
    if (query.performedByUserId) {
      qb.andWhere("event.performed_by_user_id = :performedByUserId", {
        performedByUserId: query.performedByUserId,
      });
    }
    if (query.from) {
      qb.andWhere("event.created_at >= :fromDate", { fromDate: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere("event.created_at <= :toDate", { toDate: new Date(query.to) });
    }

    const events = await qb.getMany();

    return {
      purchaseId: id,
      events,
    };
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.view_detail")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ poId: id });
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.edit_draft")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdatePurchaseOrderDto) {
    return this.updateOrder.execute(PurchaseOrderHttpMapper.toUpdateInput(id, dto));
  }

  @Patch(":id/extra-time")
  async addExtraTime(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { days?: number; hours?: number; minutes?: number },
  ) {
    const days = Number(body?.days ?? 0);
    const hours = Number(body?.hours ?? 0);
    const minutes = Number(body?.minutes ?? 0);

    if ([days, hours, minutes].some((value) => Number.isNaN(value) || value < 0)) {
      throw new BadRequestException("Valores de tiempo extra inválidos");
    }

    const extraMs = (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60) * 1000;
    if (extraMs <= 0) {
      throw new BadRequestException("Debes agregar al menos 1 minuto");
    }

    const order = await this.purchaseRepo.findById(id);
    if (!order?.expectedAt) {
      throw new BadRequestException("La orden no tiene fecha de ingreso a almacén");
    }

    const nextExpectedAt = new Date(order.expectedAt.getTime() + extraMs);
    const updated = await this.purchaseRepo.update({
      poId: id,
      expectedAt: nextExpectedAt,
    });

    if (!updated) {
      throw new BadRequestException("No se pudo actualizar la fecha de ingreso");
    }

    this.scheduler.schedule(updated.poId, nextExpectedAt);

    return {
      type: "success",
      message: "Tiempo extra agregado correctamente",
      expectedAt: nextExpectedAt,
    };
  }

  @Patch(":id/image-prodution")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchases.upload_processed_photo")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException("Solo se permiten imágenes JPG/PNG/WEBP/GIF"), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPurchaseImage(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar una imagen");
    }

    const order = await this.purchaseRepo.findById(id);
    if (!order) {
      throw new BadRequestException("Orden de compra no encontrada");
    }

    if ((order.imageProdution?.length ?? 0) > 0) {
      throw new BadRequestException("La compra ya cuenta con evidencia cargada");
    }

    let savedRelativePath = "";
    try {
      const processed = await this.imageProcessor.toWebp({
        buffer: file.buffer,
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 80,
        maxInputBytes: 10 * 1024 * 1024,
        maxInputPixels: 20_000_000,
        maxOutputBytes: 2 * 1024 * 1024,
      });

      const { relativePath } = await this.fileStorage.save({
        directory: "purchases",
        buffer: processed.buffer,
        extension: processed.extension,
        filenamePrefix: `purchase-${id}`,
      });
      savedRelativePath = relativePath;

      const urls = [...(order.imageProdution ?? []), relativePath];
      const updated = await this.purchaseRepo.update({
        poId: id,
        imageProdution: urls,
      });

      if (!updated) {
        throw new BadRequestException("No se pudo guardar la imagen en la compra");
      }

      const purchaseCode = [order.serie, order.correlative].filter(Boolean).join("-") || order.poId.slice(0, 8);
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [user.id],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PHOTO_UPLOADED,
        category: "PURCHASES",
        title: "Evidencia de compra subida",
        message: `Se agregó una imagen a la compra ${purchaseCode}.`,
        priority: "NORMAL",
        actionUrl: "/compras",
        actionLabel: "Ver compra",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: order.poId,
        metadata: {
          poId: order.poId,
          purchaseCode,
          imageCount: updated.imageProdution?.length ?? 0,
        },
      });

      return {
        type: "success",
        message: "Imagen de compra guardada correctamente",
        imageProdution: updated.imageProdution,
      };
    } catch (error) {
      if (savedRelativePath) {
        await this.fileStorage.delete(savedRelativePath).catch(() => undefined);
      }
      if (
        error instanceof ImageProcessingError ||
        error instanceof InvalidFileStoragePathError
      ) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof FileStorageConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
