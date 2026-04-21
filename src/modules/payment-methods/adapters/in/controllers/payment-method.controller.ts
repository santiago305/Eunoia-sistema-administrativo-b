import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
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
import { PaymentMethodHttpMapper } from "src/modules/payment-methods/application/mappers/payment-method-http.mapper";

@Controller("payment-methods")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
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
    return this.createPaymentMethod.execute(PaymentMethodHttpMapper.toCreatePaymentMethodInput(dto));
  }

  @Get()
  list(@Query() query: HttpPaymentMethodListQueryDto) {
    const isActived = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listPaymentMethods.execute(PaymentMethodHttpMapper.toListInput({
      name: query.name,
      isActive: isActived,
      page: query.page,
      limit: query.limit,
    }));
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
    return this.updatePaymentMethod.execute(PaymentMethodHttpMapper.toUpdatePaymentMethodInput(id, dto));
  }

  @Patch(":id/active")
  setActive(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpPaymentMethodSetActiveDto,
  ) {
    return this.setPaymentMethodActive.execute(
      PaymentMethodHttpMapper.toSetActiveInput(id, dto.isActive),
    );
  }
}
