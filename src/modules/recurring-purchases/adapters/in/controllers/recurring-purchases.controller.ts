import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateRecurringPurchaseUsecase } from "../../../application/usecases/create-recurring-purchase.usecase";
import { ListRecurringPurchasesUsecase } from "../../../application/usecases/list-recurring-purchases.usecase";
import { PauseRecurringPurchaseUsecase } from "../../../application/usecases/pause-recurring-purchase.usecase";
import { ResumeRecurringPurchaseUsecase } from "../../../application/usecases/resume-recurring-purchase.usecase";
import { CancelRecurringPurchaseUsecase } from "../../../application/usecases/cancel-recurring-purchase.usecase";
import { GenerateCurrentPayableUsecase } from "../../../application/usecases/generate-current-payable.usecase";
import { RegisterRecurringPurchasePaymentUsecase } from "../../../application/usecases/register-recurring-purchase-payment.usecase";
import { GetRecurringPurchaseSearchStateUsecase } from "../../../application/usecases/recurring-purchase-search/get-state.usecase";
import { SaveRecurringPurchaseSearchMetricUsecase } from "../../../application/usecases/recurring-purchase-search/save-metric.usecase";
import { DeleteRecurringPurchaseSearchMetricUsecase } from "../../../application/usecases/recurring-purchase-search/delete-metric.usecase";
import { HttpRecurringPurchaseCreateDto } from "../dtos/http-recurring-purchase-create.dto";
import { HttpRecurringPurchaseListDto } from "../dtos/http-recurring-purchase-list.dto";
import { HttpCreateRecurringPurchaseSearchMetricDto } from "../dtos/http-recurring-purchase-search-metric-create.dto";
import { HttpRecurringPurchasePaymentDto } from "../dtos/http-recurring-purchase-payment.dto";
import { sanitizeRecurringPurchaseSearchSnapshot } from "../../../application/support/recurring-purchase-search.utils";

@Controller("recurring-purchases")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class RecurringPurchasesController {
  constructor(
    private readonly createRecurringPurchase: CreateRecurringPurchaseUsecase,
    private readonly listRecurringPurchases: ListRecurringPurchasesUsecase,
    private readonly pauseRecurringPurchase: PauseRecurringPurchaseUsecase,
    private readonly resumeRecurringPurchase: ResumeRecurringPurchaseUsecase,
    private readonly cancelRecurringPurchase: CancelRecurringPurchaseUsecase,
    private readonly generateCurrentPayable: GenerateCurrentPayableUsecase,
    private readonly registerRecurringPayment: RegisterRecurringPurchasePaymentUsecase,
    private readonly getSearchState: GetRecurringPurchaseSearchStateUsecase,
    private readonly saveSearchMetric: SaveRecurringPurchaseSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteRecurringPurchaseSearchMetricUsecase,
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
