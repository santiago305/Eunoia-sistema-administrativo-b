import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductionOrder } from "src/modules/production/application/usecases/production-order/create.usecase";
import { ListProductionOrders } from "src/modules/production/application/usecases/production-order/list-orders.usecase";
import { GetProductionOrder } from "src/modules/production/application/usecases/production-order/get-record.usecase";
import { UpdateProductionOrder } from "src/modules/production/application/usecases/production-order/update-production-order.usecase";
import { StartProductionOrder } from "src/modules/production/application/usecases/production-order/start.usecase";
import { CloseProductionOrder } from "src/modules/production/application/usecases/production-order/close.usecase";
import { CancelProductionOrder } from "src/modules/production/application/usecases/production-order/cancel.usecase";
import { DeleteProductionOrderSearchMetricUsecase } from "src/modules/production/application/usecases/production-search/delete-metric.usecase";
import { GetProductionOrderSearchStateUsecase } from "src/modules/production/application/usecases/production-search/get-state.usecase";
import { SaveProductionOrderSearchMetricUsecase } from "src/modules/production/application/usecases/production-search/save-metric.usecase";
import { HttpCreateProductionOrderDto } from "../dtos/production-order/http-production-order-create.dto";
import { HttpUpdateProductionOrderDto } from "../dtos/production-order/http-production-order-update.dto";
import { HttpListProductionOrdersQueryDto } from "../dtos/production-order/http-production-order-list.dto";
import { HttpCreateProductionSearchMetricDto } from "../dtos/production-order/http-production-search-metric-create.dto";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { ProductionOrderHttpMapper } from "src/modules/production/application/mappers/production-order-http.mapper";
import { sanitizeProductionSearchSnapshot } from "src/modules/production/application/support/production-search.utils";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ProductionOrderExpectedScheduler } from "src/modules/production/application/jobs/production-order-expected-scheduler";
import { IMAGE_PROCESSOR, ImageProcessor } from "src/shared/application/ports/image-processor.port";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { ImageProcessingError } from "src/shared/application/errors/image-processing.error";
import { FileStorageConflictError, InvalidFileStoragePathError } from "src/shared/application/errors/file-storage.errors";
import { prepareImageForStorage } from "src/shared/utilidades/utils/prepare-image-for-storage";
import { ExportProductionOrdersExcelUsecase } from "src/modules/production/application/usecases/production-order/export-excel.usecase";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductionHistoryEventEntity } from "../../out/persistence/typeorm/entities/production-history-event.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { HttpProductionHistoryListQueryDto } from "../dtos/production-order/http-production-history-list.dto";
import { ApprovalRequestEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { PRODUCTION_NOTIFICATION_TYPES } from "src/modules/mail/domain/constants/production-notification-types";

type ProductionControllerUser = {
  id: string;
};

@Controller("production-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ProductionOrdersController {
  constructor(
    private readonly createOrder: CreateProductionOrder,
    private readonly listOrders: ListProductionOrders,
    private readonly getOrder: GetProductionOrder,
    private readonly updateOrder: UpdateProductionOrder,
    private readonly startOrder: StartProductionOrder,
    private readonly closeOrder: CloseProductionOrder,
    private readonly cancelOrder: CancelProductionOrder,
    private readonly getSearchState: GetProductionOrderSearchStateUsecase,
    private readonly saveSearchMetric: SaveProductionOrderSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteProductionOrderSearchMetricUsecase,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly scheduler: ProductionOrderExpectedScheduler,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    private readonly exportExcel: ExportProductionOrdersExcelUsecase,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
    @InjectRepository(ProductionHistoryEventEntity)
    private readonly productionHistoryRepository: Repository<ProductionHistoryEventEntity>,
    @InjectRepository(ApprovalRequestEntity)
    private readonly approvalRequestRepository: Repository<ApprovalRequestEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly accessControlService: AccessControlService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getPermissionSet(user?: ProductionControllerUser) {
    if (!user?.id) return new Set<string>();
    const effectivePermissions = await this.accessControlService.getEffectivePermissions(user.id);
    return new Set(effectivePermissions);
  }

  private hasPermission(permissions: Set<string>, permission: string) {
    return permissions.has("*") || permissions.has(permission);
  }

  private parseHistoryDate(value: string | undefined, fieldLabel: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldLabel} no es una fecha valida`);
    }
    return date;
  }

  private async canViewOrderCreatedBy(user: ProductionControllerUser, createdBy?: string | null) {
    const permissions = await this.getPermissionSet(user);
    return (
      permissions.has("*") ||
      permissions.has("production.view_all") ||
      permissions.has("production.view_created_by_others") ||
      Boolean(createdBy && createdBy === user.id)
    );
  }

  private async recordHistory(input: {
    productionId?: string | null;
    eventType: string;
    description: string;
    performedByUserId?: string | null;
    targetUserId?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!input.productionId) return;
    await this.productionHistoryRepository.save(
      this.productionHistoryRepository.create({
        productionId: input.productionId,
        eventType: input.eventType,
        description: input.description,
        performedByUserId: input.performedByUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        oldValues: input.oldValues ?? null,
        newValues: input.newValues ?? null,
        metadata: input.metadata ?? {},
      }),
    );
  }

  private getProductionCode(order: { serie?: { code?: string | null } | null; correlative?: number | null; productionId?: string; id?: string }) {
    return [order.serie?.code, order.correlative].filter(Boolean).join("-") || (order.productionId ?? order.id ?? "").slice(0, 8);
  }

  private async getProductionNotificationRecipients(permission: string, actorUserId?: string) {
    const permitted = await this.accessControlService.getUserIdsWithPermission(permission);
    const notificationEnabled = await this.accessControlService.getUserIdsWithPermission("production.receive_approval_notifications");
    const enabled = new Set(notificationEnabled);
    return permitted.filter((idValue) => idValue !== actorUserId && enabled.has(idValue));
  }

  private async getProductionWatcherRecipients(permission: string, actorUserId?: string) {
    const permitted = await this.accessControlService.getUserIdsWithPermission(permission);
    return permitted.filter((idValue) => idValue !== actorUserId);
  }

  private async notifyProductionEvent(input: {
    recipientUserIds: string[];
    type: string;
    title: string;
    message: string;
    priority?: "LOW" | "NORMAL" | "HIGH";
    productionId: string;
    metadata?: Record<string, unknown>;
    showAsToast?: boolean;
  }) {
    if (!input.recipientUserIds.length) return;
    await this.notificationsService.createNotificationForUsers({
      recipientUserIds: input.recipientUserIds,
      type: input.type,
      category: "PRODUCTION",
      title: input.title,
      message: input.message,
      priority: input.priority ?? "NORMAL",
      actionUrl: `/produccion?productionId=${input.productionId}`,
      actionLabel: "Ver produccion",
      sourceModule: "production",
      sourceEntityType: "production_order",
      sourceEntityId: input.productionId,
      metadata: {
        productionId: input.productionId,
        showAsToast: input.showAsToast ?? true,
        ...(input.metadata ?? {}),
      },
      showAsToast: input.showAsToast ?? true,
    });
  }

  private async attachPendingApprovals<T extends { productionId?: string | null; id?: string | null }>(items: T[]) {
    const productionIds = Array.from(new Set(items.map((item) => item.productionId ?? item.id).filter(Boolean))) as string[];
    if (!productionIds.length) return items;

    const pendingApprovals = await this.approvalRequestRepository
      .createQueryBuilder("approval")
      .where("approval.module = :module", { module: "production" })
      .andWhere("approval.entity_type = :entityType", { entityType: "production_order" })
      .andWhere("approval.status = :status", { status: "PENDING" })
      .andWhere("approval.entity_id IN (:...productionIds)", { productionIds })
      .orderBy("approval.created_at", "DESC")
      .getMany();

    const approvalByProductionId = new Map<string, ApprovalRequestEntity>();
    for (const approval of pendingApprovals) {
      if (!approvalByProductionId.has(approval.entityId)) {
        approvalByProductionId.set(approval.entityId, approval);
      }
    }

    return items.map((item) => {
      const productionId = item.productionId ?? item.id;
      const approval = productionId ? approvalByProductionId.get(productionId) : undefined;
      return {
        ...item,
        pendingApproval: approval
          ? {
              id: approval.id,
              action: approval.action,
              requestedByUserId: approval.requestedByUserId,
              reason: approval.reason ?? null,
              createdAt: approval.createdAt,
            }
          : null,
      };
    });
  }

  private async createProductionApprovalRequest(params: {
    productionId: string;
    action: "PRODUCTION_START" | "PRODUCTION_CLOSE";
    requestedByUserId: string;
    reason?: string | null;
    expectedStatus: string[];
    approverPermission: string;
    eventType: string;
    eventDescription: string;
    notificationType: string;
    notificationTitle: string;
    notificationMessage: string;
  }) {
    const order = await this.getOrder.execute({ productionId: params.productionId });
    if (!order) {
      throw new BadRequestException("Orden de produccion no encontrada");
    }
    if (!order.status || !params.expectedStatus.includes(order.status)) {
      throw new BadRequestException("La orden no esta en un estado valido para esta solicitud");
    }

    const pending = await this.approvalRequestRepository.findOne({
      where: {
        module: "production",
        action: params.action,
        entityType: "production_order",
        entityId: params.productionId,
        status: "PENDING",
      },
      order: { createdAt: "DESC" },
    });
    if (pending) {
      throw new ConflictException("La orden ya tiene una solicitud pendiente de aprobacion");
    }

    const reason = params.reason?.trim() || null;
    const approval = await this.approvalRequestRepository.save(
      this.approvalRequestRepository.create({
        module: "production",
        action: params.action,
        entityType: "production_order",
        entityId: params.productionId,
        requestedByUserId: params.requestedByUserId,
        status: "PENDING",
        reason,
        payloadSnapshot: {
          productionId: params.productionId,
          productionCode: this.getProductionCode(order),
          status: order.status,
          reason,
        },
      }),
    );

    await this.recordHistory({
      productionId: params.productionId,
      eventType: params.eventType,
      description: params.eventDescription,
      performedByUserId: params.requestedByUserId,
      targetUserId: order.createdBy ?? null,
      metadata: {
        approvalRequestId: approval.id,
        reason,
      },
    });

    const recipients = await this.getProductionNotificationRecipients(params.approverPermission, params.requestedByUserId);
    await this.notifyProductionEvent({
      recipientUserIds: recipients,
      type: params.notificationType,
      title: params.notificationTitle,
      message: params.notificationMessage,
      priority: "HIGH",
      productionId: params.productionId,
      metadata: {
        approvalRequestId: approval.id,
        productionCode: this.getProductionCode(order),
        reason,
      },
    });

    return {
      type: "success",
      message: "Solicitud enviada para aprobacion.",
      approval,
    };
  }

  private async reviewProductionApprovalRequest(params: {
    productionId: string;
    action: "PRODUCTION_START" | "PRODUCTION_CLOSE";
    approved: boolean;
    reviewerUserId: string;
    comment?: string | null;
    approveEventType: string;
    rejectEventType: string;
    approveDescription: string;
    rejectDescription: string;
    approvedNotificationType: string;
    rejectedNotificationType: string;
    approvedTitle: string;
    rejectedTitle: string;
    approvedMessage: string;
    rejectedMessage: string;
    executeApprovedAction: () => Promise<{ message: string }>;
  }) {
    const pending = await this.approvalRequestRepository.findOne({
      where: {
        module: "production",
        action: params.action,
        entityType: "production_order",
        entityId: params.productionId,
        status: "PENDING",
      },
      order: { createdAt: "DESC" },
    });
    if (!pending) {
      throw new BadRequestException("No existe solicitud pendiente para esta orden");
    }

    const order = await this.orderRepo.findById(params.productionId);
    const comment = params.comment?.trim() || null;
    let result: { message: string } | undefined;
    if (params.approved) {
      result = await params.executeApprovedAction();
      pending.status = "APPROVED";
    } else {
      pending.status = "REJECTED";
      pending.reason = comment;
    }
    pending.reviewedByUserId = params.reviewerUserId;
    pending.reviewedAt = new Date();
    await this.approvalRequestRepository.save(pending);

    await this.recordHistory({
      productionId: params.productionId,
      eventType: params.approved ? params.approveEventType : params.rejectEventType,
      description: params.approved ? params.approveDescription : params.rejectDescription,
      performedByUserId: params.reviewerUserId,
      targetUserId: pending.requestedByUserId,
      oldValues: { status: order?.status ?? null },
      newValues: params.approved ? { status: params.action === "PRODUCTION_START" ? "IN_PROGRESS" : "COMPLETED" } : null,
      metadata: {
        approvalRequestId: pending.id,
        comment,
      },
    });

    if (params.approved) {
      const watcherPermission =
        params.action === "PRODUCTION_START"
          ? "production.receive_started_notifications"
          : "production.receive_completed_notifications";
      const watcherRecipients = await this.getProductionWatcherRecipients(watcherPermission, params.reviewerUserId);
      await this.notifyProductionEvent({
        recipientUserIds: watcherRecipients,
        type:
          params.action === "PRODUCTION_START"
            ? PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_STARTED
            : PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_COMPLETED,
        title: params.action === "PRODUCTION_START" ? "Produccion iniciada" : "Produccion completada",
        message:
          params.action === "PRODUCTION_START"
            ? "Se inicio una orden de produccion."
            : "Se completo una orden de produccion.",
        priority: "LOW",
        productionId: params.productionId,
        metadata: {
          approvalRequestId: pending.id,
          reviewedBy: params.reviewerUserId,
        },
        showAsToast: false,
      });
    }

    await this.notifyProductionEvent({
      recipientUserIds: [pending.requestedByUserId].filter((idValue) => idValue !== params.reviewerUserId),
      type: params.approved ? params.approvedNotificationType : params.rejectedNotificationType,
      title: params.approved ? params.approvedTitle : params.rejectedTitle,
      message: params.approved ? params.approvedMessage : params.rejectedMessage,
      priority: "NORMAL",
      productionId: params.productionId,
      metadata: {
        approvalRequestId: pending.id,
        reviewedBy: params.reviewerUserId,
        comment,
      },
    });

    return {
      type: "success",
      message: params.approved ? result?.message ?? "Solicitud aprobada." : "Solicitud rechazada.",
      approval: pending,
      result,
    };
  }

  @Post()
  @RequirePermissions("production.create")
  async create(@Body() dto: HttpCreateProductionOrderDto, @CurrentUser() user: { id: string } ) {
    const result = await this.createOrder.execute(ProductionOrderHttpMapper.toCreateInput(dto), user.id);
    await this.recordHistory({
      productionId: result.order?.id,
      eventType: "PRODUCTION_CREATED",
      description: "Se creo la orden de produccion.",
      performedByUserId: user.id,
      targetUserId: user.id,
      metadata: {
        status: result.order?.status,
        itemCount: dto.items?.length ?? 0,
      },
    });
    if (result.order?.id) {
      const recipients = await this.getProductionWatcherRecipients("production.receive_created_notifications", user.id);
      await this.notifyProductionEvent({
        recipientUserIds: recipients,
        type: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_CREATED,
        title: "Produccion creada",
        message: "Se creo una orden de produccion.",
        priority: "LOW",
        productionId: result.order.id,
        metadata: {
          status: result.order.status,
          itemCount: dto.items?.length ?? 0,
        },
        showAsToast: false,
      });
    }
    return result;
  }

  @Get()
  @RequirePermissions("production.read")
  async list(@Query() query: HttpListProductionOrdersQueryDto, @CurrentUser() user: ProductionControllerUser) {
    const permissions = await this.getPermissionSet(user);
    const input = ProductionOrderHttpMapper.toListInput({
      q: query.q,
      filters: query.filters,
      status: query.status,
      warehouseId: query.warehouseId,
      skuId: query.skuId,
      from: query.from ? ParseDateLocal(query.from, "start") : undefined,
      to: query.to ? ParseDateLocal(query.to, "end") : undefined,
      page: query.page,
      limit: query.limit,
      requestedBy: user?.id,
    });

    const result = await this.listOrders.execute({
      ...input,
      visibleToUserId: user?.id,
      canViewAll: permissions.has("*") || permissions.has("production.view_all"),
      canViewCreatedByOthers: permissions.has("production.view_created_by_others"),
    });
    return {
      ...result,
      items: await this.attachPendingApprovals(result.items ?? []),
    };
  }

  @Get("search-state")
  @RequirePermissions("production.read")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Post("search-metrics")
  @RequirePermissions("production.read")
  saveMetric(
    @Body() dto: HttpCreateProductionSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeProductionSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("search-metrics/:metricId")
  @RequirePermissions("production.read")
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @Get("export-columns")
  @RequirePermissions("production.export")
  getExportColumns() {
    return this.exportExcel.getAvailableColumns();
  }

  @Get("export-presets")
  @RequirePermissions("production.export")
  getExportPresets(@CurrentUser() user: { id: string }) {
    return this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: "production-orders:export",
    }).then((state) => state.metrics);
  }

  @Post("export-presets")
  @RequirePermissions("production.export")
  saveExportPreset(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; columns: Array<{ key: string; label: string }>; useDateRange?: boolean },
  ) {
    return this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: "production-orders:export",
      name: body.name,
      snapshot: { q: "", filters: [], ...(body as any) } as any,
    });
  }

  @Delete("export-presets/:metricId")
  @RequirePermissions("production.export")
  deleteExportPreset(
    @CurrentUser() user: { id: string },
    @Param("metricId", ParseUUIDPipe) metricId: string,
  ) {
    return this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: "production-orders:export",
      metricId,
    });
  }

  @Post("export-excel")
  @RequirePermissions("production.export")
  async exportOrdersExcel(
    @Body() body: { columns: Array<{ key: string; label: string }>; q?: string; filters?: Record<string, unknown>[]; from?: string; to?: string; useDateRange?: boolean },
    @Res() res: Response,
  ) {
    const file = await this.exportExcel.execute(body);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.content);
  }

  @Get("history")
  @RequirePermissions("production.view_history")
  async listHistory(
    @Query() query: HttpListProductionOrdersQueryDto,
    @Query("eventType") eventType: string | undefined,
    @Query("eventFrom") eventFrom: string | undefined,
    @Query("eventTo") eventTo: string | undefined,
    @Query("performedByUserId") performedByUserId: string | undefined,
    @CurrentUser() user: ProductionControllerUser,
  ) {
    let productionIdsWhitelist: string[] | undefined;
    if (eventType || eventFrom || eventTo || performedByUserId) {
      const eventFromDate = this.parseHistoryDate(eventFrom, "eventFrom");
      const eventToDate = this.parseHistoryDate(eventTo, "eventTo");
      const eventQb = this.productionHistoryRepository
        .createQueryBuilder("event")
        .select("DISTINCT event.production_id", "productionId");

      if (eventType) {
        eventQb.andWhere("event.event_type = :eventType", { eventType });
      }
      if (eventFrom) {
        eventQb.andWhere("event.created_at >= :eventFrom", { eventFrom: eventFromDate });
      }
      if (eventTo) {
        eventQb.andWhere("event.created_at <= :eventTo", { eventTo: eventToDate });
      }
      if (performedByUserId) {
        eventQb.andWhere("event.performed_by_user_id = :performedByUserId", {
          performedByUserId,
        });
      }

      const filtered = await eventQb.getRawMany<{ productionId: string }>();
      productionIdsWhitelist = filtered.map((row) => row.productionId).filter(Boolean);
    }

    const permissions = await this.getPermissionSet(user);
    const input = ProductionOrderHttpMapper.toListInput({
      q: query.q,
      filters: query.filters,
      status: query.status,
      warehouseId: query.warehouseId,
      skuId: query.skuId,
      from: query.from ? ParseDateLocal(query.from, "start") : undefined,
      to: query.to ? ParseDateLocal(query.to, "end") : undefined,
      page: query.page,
      limit: query.limit,
      requestedBy: user?.id,
      productionIdsWhitelist,
    });

    const base = await this.listOrders.execute({
      ...input,
      visibleToUserId: user?.id,
      canViewAll: permissions.has("*") || permissions.has("production.view_all"),
      canViewCreatedByOthers: permissions.has("production.view_created_by_others"),
    });

    const productionIds = (base.items ?? []).map((item) => item.productionId).filter(Boolean);
    const grouped = productionIds.length
      ? await this.productionHistoryRepository
          .createQueryBuilder("event")
          .select("event.production_id", "productionId")
          .addSelect("COUNT(event.production_history_event_id)", "eventsCount")
          .addSelect("MAX(event.created_at)", "lastEventAt")
          .where("event.production_id IN (:...productionIds)", { productionIds })
          .groupBy("event.production_id")
          .getRawMany<{ productionId: string; eventsCount: string; lastEventAt: string | null }>()
      : [];

    const summaryMap = new Map(
      grouped.map((row) => [
        row.productionId,
        {
          eventsCount: Number(row.eventsCount ?? 0),
          lastEventAt: row.lastEventAt,
        },
      ]),
    );

    const itemsWithHistory = (base.items ?? []).map((item) => ({
      ...item,
      history: summaryMap.get(item.productionId) ?? {
        eventsCount: 0,
        lastEventAt: null,
      },
    }));

    return {
      ...base,
      items: await this.attachPendingApprovals(itemsWithHistory),
    };
  }

  @Get(":id/history")
  @RequirePermissions("production.view_history")
  async getProductionTimeline(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: HttpProductionHistoryListQueryDto,
    @CurrentUser() user: ProductionControllerUser,
  ) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new BadRequestException("Orden de produccion no encontrada");
    }
    if (!(await this.canViewOrderCreatedBy(user, order.createdBy))) {
      throw new ForbiddenException("No tienes permiso para ver historial de ordenes de otros usuarios.");
    }

    const qb = this.productionHistoryRepository
      .createQueryBuilder("event")
      .where("event.production_id = :productionId", { productionId: id })
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
      qb.andWhere("event.created_at >= :fromDate", { fromDate: this.parseHistoryDate(query.from, "from") });
    }
    if (query.to) {
      qb.andWhere("event.created_at <= :toDate", { toDate: this.parseHistoryDate(query.to, "to") });
    }

    const events = await qb.getMany();
    const userIds = Array.from(
      new Set(
        events
          .flatMap((event) => [event.performedByUserId ?? null, event.targetUserId ?? null])
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const users = userIds.length
      ? await this.entityManager.getRepository(User).find({
          where: userIds.map((idValue) => ({ id: idValue })),
          select: ["id", "name", "email"],
        })
      : [];
    const userMap = new Map(users.map((value) => [value.id, value]));

    return {
      productionId: id,
      events: events.map((event) => ({
        ...event,
        performedByUserName: event.performedByUserId ? userMap.get(event.performedByUserId)?.name ?? null : null,
        targetUserName: event.targetUserId ? userMap.get(event.targetUserId)?.name ?? null : null,
      })),
    };
  }

  @Get(":id")
  @RequirePermissions("production.view_detail")
  async get(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: ProductionControllerUser) {
    const order = await this.orderRepo.findById(id);
    if (order && !(await this.canViewOrderCreatedBy(user, order.createdBy))) {
      throw new ForbiddenException("No tienes permiso para ver esta orden de produccion");
    }
    return this.getOrder.execute({ productionId: id });
  }

  @Patch(":id")
  @RequirePermissions("production.edit_draft")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductionOrderDto
  ,@CurrentUser() user: { id: string } 
) {
    const before = await this.orderRepo.findById(id);
    const result = await this.updateOrder.execute(ProductionOrderHttpMapper.toUpdateInput(id, dto), user.id);
    await this.recordHistory({
      productionId: id,
      eventType: "PRODUCTION_UPDATED",
      description: "Se actualizo la orden de produccion.",
      performedByUserId: user.id,
      targetUserId: before?.createdBy ?? null,
      oldValues: before
        ? {
            status: before.status,
            fromWarehouseId: before.fromWarehouseId,
            toWarehouseId: before.toWarehouseId,
            serieId: before.serieId,
            reference: before.reference ?? null,
            manufactureDate: before.manufactureDate,
          }
        : null,
      newValues: {
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        serieId: dto.serieId,
        reference: dto.reference ?? null,
        manufactureDate: dto.manufactureDate,
        itemCount: dto.items?.length ?? 0,
      },
    });
    return result;
  }

  @Post(":id/start")
  @RequirePermissions("production.start")
  async start(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: ProductionControllerUser ) {
    const order = await this.orderRepo.findById(id);
    const result = await this.startOrder.execute({ productionId: id});
    await this.recordHistory({
      productionId: id,
      eventType: "PRODUCTION_STARTED",
      description: "Se inicio la orden de produccion.",
      performedByUserId: user.id,
      targetUserId: order?.createdBy ?? null,
      oldValues: { status: order?.status ?? null },
      newValues: { status: "IN_PROGRESS" },
    });
    const recipients = await this.getProductionWatcherRecipients("production.receive_started_notifications", user.id);
    await this.notifyProductionEvent({
      recipientUserIds: recipients,
      type: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_STARTED,
      title: "Produccion iniciada",
      message: "Se inicio una orden de produccion.",
      priority: "LOW",
      productionId: id,
      metadata: {
        previousStatus: order?.status ?? null,
      },
      showAsToast: false,
    });
    return result;
  }

  @Post(":id/request-start")
  @RequirePermissions("production.start.request")
  requestStart(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: ProductionControllerUser,
  ) {
    return this.createProductionApprovalRequest({
      productionId: id,
      action: "PRODUCTION_START",
      requestedByUserId: user.id,
      reason: body?.reason,
      expectedStatus: ["DRAFT"],
      approverPermission: "production.approve_start",
      eventType: "PRODUCTION_START_REQUESTED",
      eventDescription: "Se solicito aprobacion para iniciar la orden de produccion.",
      notificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_START_REQUESTED,
      notificationTitle: "Inicio de produccion",
      notificationMessage: "Hay una solicitud pendiente para iniciar una orden de produccion.",
    });
  }

  @Post(":id/approve-start")
  @RequirePermissions("production.approve_start")
  approveStart(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { comment?: string },
    @CurrentUser() user: ProductionControllerUser,
  ) {
    return this.reviewProductionApprovalRequest({
      productionId: id,
      action: "PRODUCTION_START",
      approved: true,
      reviewerUserId: user.id,
      comment: body?.comment,
      approveEventType: "PRODUCTION_START_APPROVED",
      rejectEventType: "PRODUCTION_START_REJECTED",
      approveDescription: "Se aprobo el inicio de la orden de produccion.",
      rejectDescription: "Se rechazo el inicio de la orden de produccion.",
      approvedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_START_APPROVED,
      rejectedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_START_REJECTED,
      approvedTitle: "Inicio aprobado",
      rejectedTitle: "Inicio rechazado",
      approvedMessage: "Tu solicitud de inicio de produccion fue aprobada.",
      rejectedMessage: "No se aprobo el inicio de produccion.",
      executeApprovedAction: () => this.startOrder.execute({ productionId: id }),
    });
  }

  @Post(":id/reject-start")
  @RequirePermissions("production.approve_start")
  rejectStart(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string; comment?: string },
    @CurrentUser() user: ProductionControllerUser,
  ) {
    return this.reviewProductionApprovalRequest({
      productionId: id,
      action: "PRODUCTION_START",
      approved: false,
      reviewerUserId: user.id,
      comment: body?.reason ?? body?.comment,
      approveEventType: "PRODUCTION_START_APPROVED",
      rejectEventType: "PRODUCTION_START_REJECTED",
      approveDescription: "Se aprobo el inicio de la orden de produccion.",
      rejectDescription: "Se rechazo el inicio de la orden de produccion.",
      approvedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_START_APPROVED,
      rejectedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_START_REJECTED,
      approvedTitle: "Inicio aprobado",
      rejectedTitle: "Inicio rechazado",
      approvedMessage: "Tu solicitud de inicio de produccion fue aprobada.",
      rejectedMessage: "No se aprobo el inicio de produccion.",
      executeApprovedAction: () => this.startOrder.execute({ productionId: id }),
    });
  }

  @Post(":id/close")
  @RequirePermissions("production.close")
  async close(@Param("id", ParseUUIDPipe) id: string,  @CurrentUser() user: { id: string } ) {
    const order = await this.orderRepo.findById(id);
    const result = await this.closeOrder.execute({ productionId: id, postedBy: user.id });
    await this.recordHistory({
      productionId: id,
      eventType: "PRODUCTION_CLOSED",
      description: "Se cerro la orden de produccion e ingreso al almacen.",
      performedByUserId: user.id,
      targetUserId: order?.createdBy ?? null,
      oldValues: { status: order?.status ?? null },
      newValues: { status: "COMPLETED" },
    });
    const recipients = await this.getProductionWatcherRecipients("production.receive_completed_notifications", user.id);
    await this.notifyProductionEvent({
      recipientUserIds: recipients,
      type: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_COMPLETED,
      title: "Produccion completada",
      message: "Se completo una orden de produccion.",
      priority: "LOW",
      productionId: id,
      metadata: {
        previousStatus: order?.status ?? null,
      },
      showAsToast: false,
    });
    return result;
  }

  @Post(":id/request-close")
  @RequirePermissions("production.close.request")
  requestClose(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: ProductionControllerUser,
  ) {
    return this.createProductionApprovalRequest({
      productionId: id,
      action: "PRODUCTION_CLOSE",
      requestedByUserId: user.id,
      reason: body?.reason,
      expectedStatus: ["IN_PROGRESS", "PARTIAL"],
      approverPermission: "production.approve_close",
      eventType: "PRODUCTION_CLOSE_REQUESTED",
      eventDescription: "Se solicito aprobacion para cerrar la orden de produccion.",
      notificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_CLOSE_REQUESTED,
      notificationTitle: "Ingreso a almacen",
      notificationMessage: "Hay una solicitud pendiente para ingresar produccion a almacen.",
    });
  }

  @Post(":id/approve-close")
  @RequirePermissions("production.approve_close")
  approveClose(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { comment?: string },
    @CurrentUser() user: ProductionControllerUser,
  ) {
    return this.reviewProductionApprovalRequest({
      productionId: id,
      action: "PRODUCTION_CLOSE",
      approved: true,
      reviewerUserId: user.id,
      comment: body?.comment,
      approveEventType: "PRODUCTION_CLOSE_APPROVED",
      rejectEventType: "PRODUCTION_CLOSE_REJECTED",
      approveDescription: "Se aprobo el cierre e ingreso a almacen de la orden de produccion.",
      rejectDescription: "Se rechazo el cierre e ingreso a almacen de la orden de produccion.",
      approvedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_CLOSE_APPROVED,
      rejectedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_CLOSE_REJECTED,
      approvedTitle: "Ingreso aprobado",
      rejectedTitle: "Ingreso rechazado",
      approvedMessage: "Tu solicitud de ingreso a almacen fue aprobada.",
      rejectedMessage: "No se aprobo el ingreso a almacen.",
      executeApprovedAction: () => this.closeOrder.execute({ productionId: id, postedBy: user.id }),
    });
  }

  @Post(":id/reject-close")
  @RequirePermissions("production.approve_close")
  rejectClose(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string; comment?: string },
    @CurrentUser() user: ProductionControllerUser,
  ) {
    return this.reviewProductionApprovalRequest({
      productionId: id,
      action: "PRODUCTION_CLOSE",
      approved: false,
      reviewerUserId: user.id,
      comment: body?.reason ?? body?.comment,
      approveEventType: "PRODUCTION_CLOSE_APPROVED",
      rejectEventType: "PRODUCTION_CLOSE_REJECTED",
      approveDescription: "Se aprobo el cierre e ingreso a almacen de la orden de produccion.",
      rejectDescription: "Se rechazo el cierre e ingreso a almacen de la orden de produccion.",
      approvedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_CLOSE_APPROVED,
      rejectedNotificationType: PRODUCTION_NOTIFICATION_TYPES.PRODUCTION_CLOSE_REJECTED,
      approvedTitle: "Ingreso aprobado",
      rejectedTitle: "Ingreso rechazado",
      approvedMessage: "Tu solicitud de ingreso a almacen fue aprobada.",
      rejectedMessage: "No se aprobo el ingreso a almacen.",
      executeApprovedAction: () => this.closeOrder.execute({ productionId: id, postedBy: user.id }),
    });
  }

  private getCancelPermissionForStatus(status?: string | null) {
    switch (status) {
      case "DRAFT":
        return {
          permission: "production.cancel_draft",
          message: "No tienes permiso para cancelar borradores de produccion",
        };
      case "IN_PROGRESS":
      case "PARTIAL":
        return {
          permission: "production.cancel_in_progress",
          message: "No tienes permiso para cancelar producciones en proceso",
        };
      case "COMPLETED":
        return {
          permission: "production.delete_completed",
          message: "No tienes permiso para revertir producciones completadas",
        };
      default:
        return null;
    }
  }

  @Post(":id/cancel")
  @RequirePermissions("production.cancel")
  async cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: ProductionControllerUser) {
    const order = await this.orderRepo.findById(id);
    const required = this.getCancelPermissionForStatus(order?.status);
    if (required) {
      const permissions = await this.getPermissionSet(user);
      if (!this.hasPermission(permissions, required.permission)) {
        throw new ForbiddenException(required.message);
      }
    }
    const result = await this.cancelOrder.execute({ productionId: id }, user.id);
    await this.recordHistory({
      productionId: id,
      eventType: "PRODUCTION_CANCELLED",
      description: "Se cancelo la orden de produccion.",
      performedByUserId: user.id,
      targetUserId: order?.createdBy ?? null,
      oldValues: { status: order?.status ?? null },
      newValues: { status: "CANCELLED" },
      metadata: {
        requiredPermission: required?.permission ?? null,
      },
    });
    return result;
  }

  @Patch(":id/extra-time")
  @RequirePermissions("production.extra-time")
  async addExtraTime(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { days?: number; hours?: number; minutes?: number },
    @CurrentUser() user: ProductionControllerUser,
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

    const order = await this.orderRepo.findById(id);
    if (!order?.manufactureDate) {
      throw new BadRequestException("La orden no tiene fecha de culminación");
    }
    if (order.status !== "IN_PROGRESS" && order.status !== "PARTIAL") {
      throw new BadRequestException("Solo se puede agregar tiempo extra en una orden en proceso");
    }

    const nextManufactureDate = new Date(order.manufactureDate.getTime() + extraMs);
    const updated = await this.orderRepo.update({
      productionId: id,
      manufactureDate: nextManufactureDate,
    });
    if (!updated) {
      throw new BadRequestException("No se pudo actualizar la fecha de culminación");
    }

    if (updated.status === "IN_PROGRESS") {
      this.scheduler.schedule(updated.productionId, nextManufactureDate);
    }

    await this.recordHistory({
      productionId: id,
      eventType: "PRODUCTION_EXTRA_TIME_ADDED",
      description: "Se agrego tiempo extra a la orden de produccion.",
      performedByUserId: user.id,
      targetUserId: order.createdBy ?? null,
      oldValues: { manufactureDate: order.manufactureDate },
      newValues: { manufactureDate: nextManufactureDate },
      metadata: { days, hours, minutes },
    });

    return {
      type: "success",
      message: "Tiempo extra agregado correctamente",
      manufactureDate: nextManufactureDate,
    };
  }

  @Patch(":id/image-prodution")
  @RequirePermissions("production.image.upload")
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
  async uploadProductionImage(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ProductionControllerUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar una imagen");
    }

    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new BadRequestException("Orden de producción no encontrada");
    }

    const userPermissions = await this.getPermissionSet(user);
    const canUploadExtraImage =
      userPermissions.has("*") || userPermissions.has("production.image.upload_extra");
    if ((order.imageProdution?.length ?? 0) > 0 && !canUploadExtraImage) {
      throw new BadRequestException("No tienes permiso para agregar fotos adicionales en esta orden");
    }

    let savedRelativePath = "";
    try {
      const preparedFile = await prepareImageForStorage(file, this.imageProcessor, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 80,
        maxInputBytes: 10 * 1024 * 1024,
        maxInputPixels: 20_000_000,
        maxOutputBytes: 2 * 1024 * 1024,
      });

      const { relativePath } = await this.fileStorage.save({
        directory: "production",
        buffer: preparedFile.buffer,
        extension: preparedFile.extension,
        filenamePrefix: `production-${id}`,
      });
      savedRelativePath = relativePath;

      const urls = [...(order.imageProdution ?? []), relativePath];
      const updated = await this.orderRepo.update({
        productionId: id,
        imageProdution: urls,
      });

      if (!updated) {
        throw new BadRequestException("No se pudo guardar la imagen en la orden");
      }

      await this.recordHistory({
        productionId: id,
        eventType: "PRODUCTION_IMAGE_UPLOADED",
        description: "Se subio evidencia fotografica de produccion.",
        performedByUserId: user.id,
        targetUserId: order.createdBy ?? null,
        oldValues: { imageCount: order.imageProdution?.length ?? 0 },
        newValues: { imageCount: updated.imageProdution?.length ?? 0 },
        metadata: {
          imagePath: relativePath,
          imageCount: updated.imageProdution?.length ?? 0,
        },
      });

      return {
        type: "success",
        message: "Imagen de producción guardada correctamente",
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


