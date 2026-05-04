import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
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
import { RoleType } from "src/shared/constantes/constants";
import { NotificationsService } from "src/modules/notifications/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/notifications/domain/constants/purchase-notification-types";

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
  ) {}

  @Post()
  async create(@Body() dto: HttpCreatePurchaseOrderDto, @CurrentUser() user: { id: string }) {
    try {
      const result = await this.createOrder.execute(
        PurchaseOrderHttpMapper.toCreateInput(dto),
        user.id,
      );
        return {
          type: "success",
          message: "Orden de compra creada correctamente",
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
  setSentPurchase(@Param("id", ParseUUIDPipe) id: string) {
    return this.setSent.execute(id);
  }

  @Patch(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string) {
    return this.cancelOrder.execute(id);
  }

  @Post(":id/run-expected")
  runExpectedAt(@Param("id", ParseUUIDPipe) id: string) {
    return this.runExpected.execute(id);
  }

  @Post(":id/confirm-reception")
  confirmPurchaseReception(@Param("id", ParseUUIDPipe) id: string) {
    return this.confirmReception.execute(id);
  }

  @Get()
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

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ poId: id });
  }

  @Patch(":id")
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

    const isAdmin = (user?.role ?? "").toLowerCase() === RoleType.ADMIN;
    if ((order.imageProdution?.length ?? 0) > 0 && !isAdmin) {
      throw new BadRequestException("Solo un administrador puede agregar más fotos en esta compra");
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
