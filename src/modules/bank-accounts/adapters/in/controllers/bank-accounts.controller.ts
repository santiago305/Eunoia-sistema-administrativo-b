import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateBankAccountUsecase } from "src/modules/bank-accounts/application/usecases/bank-account/create.usecase";
import { ListBankAccountsByCompanyUsecase } from "src/modules/bank-accounts/application/usecases/bank-account/list-by-company.usecase";
import { GetBankAccountByIdUsecase } from "src/modules/bank-accounts/application/usecases/bank-account/get-by-id.usecase";
import { UpdateBankAccountUsecase } from "src/modules/bank-accounts/application/usecases/bank-account/update.usecase";
import { SetBankAccountActiveUsecase } from "src/modules/bank-accounts/application/usecases/bank-account/set-active.usecase";
import { HttpBankAccountCreateDto } from "../dtos/http-bank-account-create.dto";
import { HttpBankAccountUpdateDto } from "../dtos/http-bank-account-update.dto";
import { HttpBankAccountSetActiveDto } from "../dtos/http-bank-account-set-active.dto";

@Controller("bank-accounts")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class BankAccountsController {
  constructor(
    private readonly createBankAccount: CreateBankAccountUsecase,
    private readonly listByCompany: ListBankAccountsByCompanyUsecase,
    private readonly getById: GetBankAccountByIdUsecase,
    private readonly update: UpdateBankAccountUsecase,
    private readonly setActive: SetBankAccountActiveUsecase,
  ) {}

  @RequirePermissions("bank-accounts.manage")
  @Post()
  create(@Body() dto: HttpBankAccountCreateDto) {
    return this.createBankAccount.execute({
      companyId: dto.companyId,
      name: dto.name,
      number: dto.number,
      isActive: dto.isActive,
    });
  }

  @RequirePermissions("bank-accounts.read")
  @Get("by-company/:companyId")
  list(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.listByCompany.execute({ companyId });
  }

  @RequirePermissions("bank-accounts.read")
  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getById.execute({ bankAccountId: id });
  }

  @RequirePermissions("bank-accounts.manage")
  @Patch(":id")
  patch(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpBankAccountUpdateDto) {
    const input: any = { bankAccountId: id };
    if (dto.name !== undefined) input.name = dto.name;
    if (Object.prototype.hasOwnProperty.call(dto, "number")) input.number = dto.number;
    return this.update.execute(input);
  }

  @RequirePermissions("bank-accounts.manage")
  @Patch(":id/active")
  active(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpBankAccountSetActiveDto) {
    return this.setActive.execute({ bankAccountId: id, isActive: dto.isActive });
  }
}

