import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreatePaymentUsecase } from "src/modules/payments/application/usecases/payment/create.usecase";
import { DeletePaymentUsecase } from "src/modules/payments/application/usecases/payment/delete.usecase";
import { GetPaymentUsecase } from "src/modules/payments/application/usecases/payment/get-by-id.usecase";
import { ListPaymentsUsecase } from "src/modules/payments/application/usecases/payment/list.usecase";
import { HttpCreatePaymentDto } from "../dtos/payment/http-payment-create.dto";
import { HttpListPaymentsQueryDto } from "../dtos/payment/http-payment-list.dto";

@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly createPayment: CreatePaymentUsecase,
    private readonly deletePayment: DeletePaymentUsecase,
    private readonly getPayment: GetPaymentUsecase,
    private readonly listPayments: ListPaymentsUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreatePaymentDto) {
    return this.createPayment.execute(dto);
  }

  @Get()
  list(@Query() query: HttpListPaymentsQueryDto) {
    return this.listPayments.execute({
      poId: query.poId,
      quotaId: query.quotaId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPayment.execute({ payDocId: id });
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.deletePayment.execute(id);
  }
}
