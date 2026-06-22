import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateCompanyPaymentAccountUsecase } from "../../../application/usecases/create-company-payment-account.usecase";
import { ListCompanyPaymentAccountsUsecase } from "../../../application/usecases/list-company-payment-accounts.usecase";
import { UpdateCompanyPaymentAccountUsecase } from "../../../application/usecases/update-company-payment-account.usecase";
import { SetCompanyPaymentAccountActiveUsecase } from "../../../application/usecases/set-company-payment-account-active.usecase";
import { HttpCompanyPaymentAccountCreateDto } from "../dtos/http-company-payment-account-create.dto";
import {
  HttpCompanyPaymentAccountSetActiveDto,
  HttpCompanyPaymentAccountUpdateDto,
} from "../dtos/http-company-payment-account-update.dto";

@Controller("company-payment-accounts")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class CompanyPaymentAccountsController {
  constructor(
    private readonly createAccount: CreateCompanyPaymentAccountUsecase,
    private readonly listAccounts: ListCompanyPaymentAccountsUsecase,
    private readonly updateAccount: UpdateCompanyPaymentAccountUsecase,
    private readonly setActive: SetCompanyPaymentAccountActiveUsecase,
  ) {}

  @RequirePermissions("payment_accounts.create")
  @Post()
  create(@Body() dto: HttpCompanyPaymentAccountCreateDto) {
    return this.createAccount.execute(dto);
  }

  @RequirePermissions("payment_accounts.view")
  @Get("by-company/:companyId")
  listByCompany(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.listAccounts.execute({ companyId });
  }

  @RequirePermissions("payment_accounts.edit")
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpCompanyPaymentAccountUpdateDto) {
    return this.updateAccount.execute({ id, ...dto });
  }

  @RequirePermissions("payment_accounts.disable")
  @Patch(":id/active")
  active(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpCompanyPaymentAccountSetActiveDto) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }
}
