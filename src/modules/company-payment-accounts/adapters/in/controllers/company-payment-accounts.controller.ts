import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
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
    private readonly accessControlService: AccessControlService,
  ) {}

  private async canViewSensitive(user: { id?: string; sub?: string } | null) {
    const userId = user?.id || user?.sub;
    if (!userId) return false;

    const permissions = await this.accessControlService.getEffectivePermissions(userId);
    return permissions.includes("*") || permissions.includes("payment_accounts.view_sensitive");
  }

  @RequirePermissions("payment_accounts.create")
  @Post()
  async create(@Body() dto: HttpCompanyPaymentAccountCreateDto, @CurrentUser() user: { id?: string; sub?: string }) {
    return this.createAccount.execute({
      ...dto,
      includeSensitive: await this.canViewSensitive(user),
    });
  }

  @RequirePermissions("payment_accounts.view")
  @Get("by-company/:companyId")
  async listByCompany(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() user: { id?: string; sub?: string },
  ) {
    return this.listAccounts.execute({
      companyId,
      includeSensitive: await this.canViewSensitive(user),
    });
  }

  @RequirePermissions("payment_accounts.edit")
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: HttpCompanyPaymentAccountUpdateDto,
    @CurrentUser() user: { id?: string; sub?: string },
  ) {
    return this.updateAccount.execute({
      id,
      ...dto,
      includeSensitive: await this.canViewSensitive(user),
    });
  }

  @RequirePermissions("payment_accounts.disable")
  @Patch(":id/active")
  active(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpCompanyPaymentAccountSetActiveDto) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }
}
