import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreatePaymentUsecase } from "src/modules/payments/application/usecases/payment/create.usecase";
import { DeletePaymentUsecase } from "src/modules/payments/application/usecases/payment/delete.usecase";
import { GetPaymentUsecase } from "src/modules/payments/application/usecases/payment/get-by-id.usecase";
import { GetPaymentsByPoIdUsecase } from "src/modules/payments/application/usecases/payment/get-by-po-id.usecase";
import { ListPaymentsUsecase } from "src/modules/payments/application/usecases/payment/list.usecase";
import { PaymentsHttpMapper } from "src/modules/payments/application/mappers/payments-http.mapper";
import { HttpCreatePaymentDto } from "../dtos/payment/http-payment-create.dto";
import { HttpListPaymentsQueryDto } from "../dtos/payment/http-payment-list.dto";

@Controller("payments")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PaymentsController {
  constructor(
    private readonly createPayment: CreatePaymentUsecase,
    private readonly deletePayment: DeletePaymentUsecase,
    private readonly getPayment: GetPaymentUsecase,
    private readonly getPaymentsByPoId: GetPaymentsByPoIdUsecase,
    private readonly listPayments: ListPaymentsUsecase,
  ) {}

  @RequirePermissions("payments.manage")
  @Post()
  create(@Body() dto: HttpCreatePaymentDto) {
    return this.createPayment.execute(PaymentsHttpMapper.toCreatePaymentInput(dto));
  }

  @RequirePermissions("payments.read")
  @Get()
  list(@Query() query: HttpListPaymentsQueryDto) {
    return this.listPayments.execute(PaymentsHttpMapper.toListPaymentsInput({
      poId: query.poId,
      quotaId: query.quotaId,
      page: query.page,
      limit: query.limit,
    }));
  }

  @RequirePermissions("payments.read")
  @Get("get-by-po/:id")
  listByPoId(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPaymentsByPoId.execute({ poId: id });
  }

  @RequirePermissions("payments.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPayment.execute({ payDocId: id });
  }

  @RequirePermissions("payments.manage")
  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.deletePayment.execute(id);
  }
}
