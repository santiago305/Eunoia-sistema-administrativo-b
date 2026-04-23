import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
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

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrder.execute({ poId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdatePurchaseOrderDto) {
    return this.updateOrder.execute(PurchaseOrderHttpMapper.toUpdateInput(id, dto));
  }
}
