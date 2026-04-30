import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
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
import { RoleType } from "src/shared/constantes/constants";

@Controller("production-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
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
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductionOrderDto, @CurrentUser() user: { id: string } ) {
    return this.createOrder.execute(ProductionOrderHttpMapper.toCreateInput(dto), user.id);
  }

  @Get()
  list(@Query() query: HttpListProductionOrdersQueryDto, @CurrentUser() user: { id: string }) {
    return this.listOrders.execute(ProductionOrderHttpMapper.toListInput({
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
    }));
  }

  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Post("search-metrics")
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
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ productionId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductionOrderDto
  ,@CurrentUser() user: { id: string } 
) {
    return this.updateOrder.execute(ProductionOrderHttpMapper.toUpdateInput(id, dto), user.id);
  }

  @Post(":id/start")
  start(@Param("id", ParseUUIDPipe) id: string ) {
    return this.startOrder.execute({ productionId: id});
  }

  @Post(":id/close")
  close(@Param("id", ParseUUIDPipe) id: string,  @CurrentUser() user: { id: string } ) {
    return this.closeOrder.execute({ productionId: id, postedBy: user.id });
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.cancelOrder.execute({ productionId: id }, user.id);
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

    return {
      type: "success",
      message: "Tiempo extra agregado correctamente",
      manufactureDate: nextManufactureDate,
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
  async uploadProductionImage(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { role?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar una imagen");
    }

    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new BadRequestException("Orden de producción no encontrada");
    }

    const isAdmin = (user?.role ?? "").toLowerCase() === RoleType.ADMIN;
    if ((order.imageProdution?.length ?? 0) > 0 && !isAdmin) {
      throw new BadRequestException("Solo un administrador puede agregar más fotos en esta orden");
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
        directory: "production",
        buffer: processed.buffer,
        extension: processed.extension,
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


