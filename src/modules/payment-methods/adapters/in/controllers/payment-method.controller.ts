import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreatePaymentMethodUsecase } from "src/modules/payment-methods/application/usecases/payment-method/create.usecase";
import { UpdatePaymentMethodUsecase } from "src/modules/payment-methods/application/usecases/payment-method/update.usecase";
import { SetPaymentMethodActiveUsecase } from "src/modules/payment-methods/application/usecases/payment-method/set-active.usecase";
import { GetPaymentMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/payment-method/get-by-id.usecase";
import { GetPaymentMethodsByCompanyUsecase } from "src/modules/payment-methods/application/usecases/payment-method/get-by-company.usecase";
import { GetPaymentMethodsBySupplierUsecase } from "src/modules/payment-methods/application/usecases/payment-method/get-by-supplier.usecase";
import { ListPaymentMethodsUsecase } from "src/modules/payment-methods/application/usecases/payment-method/list.usecase";
import { GetPaymentMethodsRecordsUsecase } from "src/modules/payment-methods/application/usecases/payment-method/get-records.usecase";
import { HttpPaymentMethodCreateDto } from "../dtos/payment-method/http-payment-method-create.dto";
import { HttpPaymentMethodUpdateDto } from "../dtos/payment-method/http-payment-method-update.dto";
import { HttpPaymentMethodSetActiveDto } from "../dtos/payment-method/http-payment-method-set-active.dto";
import { HttpPaymentMethodListQueryDto } from "../dtos/payment-method/http-payment-method-list.dto";

@Controller("payment-methods")
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(
    private readonly createPaymentMethod: CreatePaymentMethodUsecase,
    private readonly updatePaymentMethod: UpdatePaymentMethodUsecase,
    private readonly setPaymentMethodActive: SetPaymentMethodActiveUsecase,
    private readonly getPaymentMethodById: GetPaymentMethodByIdUsecase,
    private readonly getPaymentMethodsByCompany: GetPaymentMethodsByCompanyUsecase,
    private readonly getPaymentMethodsBySupplier: GetPaymentMethodsBySupplierUsecase,
    private readonly listPaymentMethods: ListPaymentMethodsUsecase,
    private readonly getPaymentMethodsRecords: GetPaymentMethodsRecordsUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpPaymentMethodCreateDto) {
    return this.createPaymentMethod.execute(dto);
  }

  @Get()
  list(@Query() query: HttpPaymentMethodListQueryDto) {
    const isActived = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listPaymentMethods.execute({
      name: query.name?.trim(),
      isActive: isActived,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get("records")
  getRecords() {
    return this.getPaymentMethodsRecords.execute();
  }

  @Get("by-company/:companyId")
  getByCompany(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.getPaymentMethodsByCompany.execute({ companyId });
  }

  @Get("by-supplier/:supplierId")
  getBySupplier(@Param("supplierId", ParseUUIDPipe) supplierId: string) {
    return this.getPaymentMethodsBySupplier.execute({ supplierId });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPaymentMethodById.execute({ methodId: id });
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpPaymentMethodUpdateDto,
  ) {
    return this.updatePaymentMethod.execute({ methodId: id, ...dto });
  }

  @Patch(":id/active")
  setActive(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpPaymentMethodSetActiveDto,
  ) {
    return this.setPaymentMethodActive.execute({ methodId: id, isActive: dto.isActive });
  }
}
