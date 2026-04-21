import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateCreditQuotaUsecase } from "src/modules/payments/application/usecases/credit-quota/create.usecase";
import { DeleteCreditQuotaUsecase } from "src/modules/payments/application/usecases/credit-quota/delete.usecase";
import { GetCreditQuotaUsecase } from "src/modules/payments/application/usecases/credit-quota/get-by-id.usecase";
import { GetCreditQuotasByPoIdUsecase } from "src/modules/payments/application/usecases/credit-quota/get-by-po-id.usecase";
import { ListCreditQuotasUsecase } from "src/modules/payments/application/usecases/credit-quota/list.usecase";
import { PaymentsHttpMapper } from "src/modules/payments/application/mappers/payments-http.mapper";
import { HttpCreateCreditQuotaDto } from "../dtos/credit-quota/http-credit-quota-create.dto";
import { HttpListCreditQuotasQueryDto } from "../dtos/credit-quota/http-credit-quota-list.dto";

@Controller("payments/credit-quotas")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class CreditQuotasController {
  constructor(
    private readonly createQuota: CreateCreditQuotaUsecase,
    private readonly deleteQuota: DeleteCreditQuotaUsecase,
    private readonly getQuota: GetCreditQuotaUsecase,
    private readonly getQuotasByPoId: GetCreditQuotasByPoIdUsecase,
    private readonly listQuotas: ListCreditQuotasUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateCreditQuotaDto) {
    return this.createQuota.execute(PaymentsHttpMapper.toCreateCreditQuotaInput(dto));
  }

  @Get()
  list(@Query() query: HttpListCreditQuotasQueryDto) {
    return this.listQuotas.execute(PaymentsHttpMapper.toListCreditQuotasInput({
      poId: query.poId,
      page: query.page,
      limit: query.limit,
    }));
  }

  @Get("get-by-po/:poId")
  listByPoId(@Param("poId", ParseUUIDPipe) poId: string) {
    return this.getQuotasByPoId.execute({ poId });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getQuota.execute({ quotaId: id });
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.deleteQuota.execute(id);
  }
}
