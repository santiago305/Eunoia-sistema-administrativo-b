import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateRecurringPurchaseUsecase } from "../../../application/usecases/create-recurring-purchase.usecase";
import { UpdateRecurringPurchaseUsecase } from "../../../application/usecases/update-recurring-purchase.usecase";
import { ListRecurringPurchasesUsecase } from "../../../application/usecases/list-recurring-purchases.usecase";
import { PauseRecurringPurchaseUsecase } from "../../../application/usecases/pause-recurring-purchase.usecase";
import { ResumeRecurringPurchaseUsecase } from "../../../application/usecases/resume-recurring-purchase.usecase";
import { CancelRecurringPurchaseUsecase } from "../../../application/usecases/cancel-recurring-purchase.usecase";
import { GenerateCurrentPayableUsecase } from "../../../application/usecases/generate-current-payable.usecase";
import { RegisterRecurringPurchasePaymentUsecase } from "../../../application/usecases/register-recurring-purchase-payment.usecase";
import { ExportRecurringPurchasesExcelUsecase } from "../../../application/usecases/export-recurring-purchases-excel.usecase";
import { GetRecurringPurchaseSearchStateUsecase } from "../../../application/usecases/recurring-purchase-search/get-state.usecase";
import { SaveRecurringPurchaseSearchMetricUsecase } from "../../../application/usecases/recurring-purchase-search/save-metric.usecase";
import { DeleteRecurringPurchaseSearchMetricUsecase } from "../../../application/usecases/recurring-purchase-search/delete-metric.usecase";
import { HttpRecurringPurchaseCreateDto } from "../dtos/http-recurring-purchase-create.dto";
import { HttpRecurringPurchaseListDto } from "../dtos/http-recurring-purchase-list.dto";
import { HttpCreateRecurringPurchaseSearchMetricDto } from "../dtos/http-recurring-purchase-search-metric-create.dto";
import { HttpRecurringPurchasePaymentDto } from "../dtos/http-recurring-purchase-payment.dto";
import { HttpExportRecurringPurchasesDto } from "../dtos/http-export-recurring-purchases.dto";
import { sanitizeRecurringPurchaseSearchSnapshot } from "../../../application/support/recurring-purchase-search.utils";

const RECURRING_PURCHASE_EXPORT_TABLE_KEY = "recurring-purchases:export";

@Controller("recurring-purchases")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class RecurringPurchasesController {
  constructor(
    private readonly createRecurringPurchase: CreateRecurringPurchaseUsecase,
    private readonly updateRecurringPurchase: UpdateRecurringPurchaseUsecase,
    private readonly listRecurringPurchases: ListRecurringPurchasesUsecase,
    private readonly pauseRecurringPurchase: PauseRecurringPurchaseUsecase,
    private readonly resumeRecurringPurchase: ResumeRecurringPurchaseUsecase,
    private readonly cancelRecurringPurchase: CancelRecurringPurchaseUsecase,
    private readonly generateCurrentPayable: GenerateCurrentPayableUsecase,
    private readonly registerRecurringPayment: RegisterRecurringPurchasePaymentUsecase,
    private readonly exportExcel: ExportRecurringPurchasesExcelUsecase,
    private readonly getSearchState: GetRecurringPurchaseSearchStateUsecase,
    private readonly saveSearchMetric: SaveRecurringPurchaseSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteRecurringPurchaseSearchMetricUsecase,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
  ) {}

  @RequirePermissions("recurring_purchases.view")
  @Get()
  list(@Query() query: HttpRecurringPurchaseListDto, @CurrentUser() user: { id: string }) {
    return this.listRecurringPurchases.execute({
      ...query,
      requestedBy: user?.id,
    });
  }

  @RequirePermissions("recurring_purchases.view")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequirePermissions("recurring_purchases.view")
  @Post("search-metrics")
  saveMetric(
    @Body() dto: HttpCreateRecurringPurchaseSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeRecurringPurchaseSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("recurring_purchases.view")
  @Delete("search-metrics/:metricId")
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequirePermissions("recurring_purchases.view")
  @Get("export-columns")
  getExportColumns() {
    return this.exportExcel.getAvailableColumns();
  }

  @RequirePermissions("recurring_purchases.view")
  @Get("export-presets")
  async getExportPresets(@CurrentUser() user: { id: string }) {
    const state = await this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: RECURRING_PURCHASE_EXPORT_TABLE_KEY,
    });
    return state.metrics;
  }

  @RequirePermissions("recurring_purchases.view")
  @Post("export-presets")
  saveExportPreset(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; columns: Array<{ key: string; label: string }> },
  ) {
    return this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: RECURRING_PURCHASE_EXPORT_TABLE_KEY,
      name: body.name,
      snapshot: {
        q: "",
        filters: [],
        columns: body.columns ?? [],
      } as any,
    });
  }

  @RequirePermissions("recurring_purchases.view")
  @Delete("export-presets/:metricId")
  deleteExportPreset(
    @CurrentUser() user: { id: string },
    @Param("metricId", ParseUUIDPipe) metricId: string,
  ) {
    return this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: RECURRING_PURCHASE_EXPORT_TABLE_KEY,
      metricId,
    });
  }

  @RequirePermissions("recurring_purchases.export")
  @Post("export-excel")
  async exportRecurringPurchasesExcel(
    @Body() dto: HttpExportRecurringPurchasesDto,
    @Res() res: Response,
  ) {
    const file = await this.exportExcel.execute({
      columns: dto.columns,
      q: dto.q,
      filters: dto.filters,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.content);
  }

  @RequirePermissions("recurring_purchases.create")
  @Post()
  create(@Body() dto: HttpRecurringPurchaseCreateDto, @CurrentUser() user: { id: string }) {
    return this.createRecurringPurchase.execute({
      ...dto,
      startDate: new Date(dto.startDate),
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
      createdByUserId: user.id,
    });
  }

  @RequirePermissions("recurring_purchases.edit")
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpRecurringPurchaseCreateDto,
  ) {
    return this.updateRecurringPurchase.execute({
      recurringPurchaseTemplateId: id,
      ...dto,
      startDate: new Date(dto.startDate),
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
    });
  }

  @RequirePermissions("recurring_purchases.pause")
  @Patch(":id/pause")
  pause(@Param("id", ParseUUIDPipe) id: string) {
    return this.pauseRecurringPurchase.execute(id);
  }

  @RequirePermissions("recurring_purchases.pause")
  @Patch(":id/resume")
  resume(@Param("id", ParseUUIDPipe) id: string) {
    return this.resumeRecurringPurchase.execute(id);
  }

  @RequirePermissions("recurring_purchases.cancel")
  @Patch(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string) {
    return this.cancelRecurringPurchase.execute(id);
  }

  @RequirePermissions("recurring_purchases.pay")
  @Post(":id/generate-current-payable")
  generate(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.generateCurrentPayable.execute({ templateId: id, generatedByUserId: user.id });
  }

  @RequirePermissions("recurring_purchases.register_payment")
  @Post(":id/register-payment")
  registerPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpRecurringPurchasePaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.registerRecurringPayment.execute({
      templateId: id,
      userId: user.id,
      payment: dto,
    });
  }
}
