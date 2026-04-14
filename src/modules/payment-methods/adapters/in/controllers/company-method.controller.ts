import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/create.usecase";
import { DeleteCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/delete.usecase";
import { GetCompanyMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/company-method/get-by-id.usecase";
import { ListCompanyMethodsUsecase } from "src/modules/payment-methods/application/usecases/company-method/list.usecase";
import { UpdateCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/update.usecase";
import { HttpCompanyMethodCreateDto } from "../dtos/company-method/http-company-method-create.dto";
import { HttpCompanyMethodUpdateDto } from "../dtos/company-method/http-company-method-update.dto";
import { PaymentMethodHttpMapper } from "src/modules/payment-methods/application/mappers/payment-method-http.mapper";

@Controller("company-methods")
@UseGuards(JwtAuthGuard)
export class CompanyMethodsController {
  constructor(
    private readonly createCompanyMethod: CreateCompanyMethodUsecase,
    private readonly listCompanyMethods: ListCompanyMethodsUsecase,
    private readonly updateCompanyMethod: UpdateCompanyMethodUsecase,
    private readonly deleteCompanyMethod: DeleteCompanyMethodUsecase,
    private readonly getCompanyMethodById: GetCompanyMethodByIdUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCompanyMethodCreateDto) {
    return this.createCompanyMethod.execute(PaymentMethodHttpMapper.toCreateCompanyMethodInput(dto));
  }

  @Get("by-company/:companyId")
  listByCompany(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.listCompanyMethods.execute({ companyId });
  }

  @Get(":companyMethodId")
  getById(
    @Param("companyMethodId", ParseUUIDPipe) companyMethodId: string,
  ) {
    return this.getCompanyMethodById.execute({ companyMethodId });
  }

  @Patch(":companyMethodId")
  update(
    @Param("companyMethodId", ParseUUIDPipe) companyMethodId: string,
    @Body() dto: HttpCompanyMethodUpdateDto,
  ) {
    return this.updateCompanyMethod.execute(
      PaymentMethodHttpMapper.toUpdateCompanyMethodInput(companyMethodId, dto),
    );
  }

  @Delete(":companyMethodId")
  remove(
    @Param("companyMethodId", ParseUUIDPipe) companyMethodId: string,
  ) {
    return this.deleteCompanyMethod.execute({ companyMethodId });
  }
}
