import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/create.usecase";
import { DeleteCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/delete.usecase";
import { GetCompanyMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/company-method/get-by-id.usecase";
import { ListCompanyMethodsUsecase } from "src/modules/payment-methods/application/usecases/company-method/list.usecase";
import { UpdateCompanyMethodUsecase } from "src/modules/payment-methods/application/usecases/company-method/update.usecase";
import { HttpCompanyMethodCreateDto } from "../dtos/company-method/http-company-method-create.dto";
import { HttpCompanyMethodUpdateDto } from "../dtos/company-method/http-company-method-update.dto";
import { PaymentMethodHttpMapper } from "src/modules/payment-methods/application/mappers/payment-method-http.mapper";

@Controller("company-methods")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class CompanyMethodsController {
  constructor(
    private readonly createCompanyMethod: CreateCompanyMethodUsecase,
    private readonly listCompanyMethods: ListCompanyMethodsUsecase,
    private readonly updateCompanyMethod: UpdateCompanyMethodUsecase,
    private readonly deleteCompanyMethod: DeleteCompanyMethodUsecase,
    private readonly getCompanyMethodById: GetCompanyMethodByIdUsecase,
  ) {}

  @RequirePermissions("payment-methods.manage")
  @Post()
  create(@Body() dto: HttpCompanyMethodCreateDto) {
    return this.createCompanyMethod.execute(PaymentMethodHttpMapper.toCreateCompanyMethodInput(dto));
  }

  @RequirePermissions("payment-methods.read")
  @Get("by-company/:companyId")
  listByCompany(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.listCompanyMethods.execute({ companyId });
  }

  @RequirePermissions("payment-methods.read")
  @Get(":companyMethodId")
  getById(
    @Param("companyMethodId", ParseUUIDPipe) companyMethodId: string,
  ) {
    return this.getCompanyMethodById.execute({ companyMethodId });
  }

  @RequirePermissions("payment-methods.manage")
  @Patch(":companyMethodId")
  update(
    @Param("companyMethodId", ParseUUIDPipe) companyMethodId: string,
    @Body() dto: HttpCompanyMethodUpdateDto,
  ) {
    return this.updateCompanyMethod.execute(
      PaymentMethodHttpMapper.toUpdateCompanyMethodInput(companyMethodId, dto),
    );
  }

  @RequirePermissions("payment-methods.manage")
  @Delete(":companyMethodId")
  remove(
    @Param("companyMethodId", ParseUUIDPipe) companyMethodId: string,
  ) {
    return this.deleteCompanyMethod.execute({ companyMethodId });
  }
}
