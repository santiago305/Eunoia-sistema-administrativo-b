import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/create.usecase";
import { DeleteCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/delete.usecase";
import { GetCompanyMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/company-method/get-by-id.usecase";
import { HttpCompanyMethodCreateDto } from "../dtos/company-method/http-company-method-create.dto";
import { PaymentMethodHttpMapper } from "src/modules/payment-methods/application/mappers/payment-method-http.mapper";

@Controller("company-methods")
@UseGuards(JwtAuthGuard)
export class CompanyMethodsController {
  constructor(
    private readonly createCompanyMethod: CreateCompanyMethodUsecase,
    private readonly deleteCompanyMethod: DeleteCompanyMethodUsecase,
    private readonly getCompanyMethodById: GetCompanyMethodByIdUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCompanyMethodCreateDto) {
    return this.createCompanyMethod.execute(PaymentMethodHttpMapper.toCreateCompanyMethodInput(dto));
  }

  @Get(":companyId/:methodId")
  getById(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("methodId", ParseUUIDPipe) methodId: string,
  ) {
    return this.getCompanyMethodById.execute({ companyId, methodId });
  }

  @Delete(":companyId/:methodId")
  remove(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("methodId", ParseUUIDPipe) methodId: string,
  ) {
    return this.deleteCompanyMethod.execute({ companyId, methodId });
  }
}
