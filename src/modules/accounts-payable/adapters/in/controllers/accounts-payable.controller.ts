import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { ListAccountPayablesUsecase } from "src/modules/accounts-payable/application/usecases/list-account-payables.usecase";
import { MarkOverdueAccountPayablesUsecase } from "src/modules/accounts-payable/application/usecases/mark-overdue-account-payables.usecase";
import { HttpAccountPayableListDto } from "../dtos/http-account-payable-list.dto";

@Controller("accounts-payable")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class AccountsPayableController {
  constructor(
    private readonly listAccountPayables: ListAccountPayablesUsecase,
    private readonly markOverdueAccountPayables: MarkOverdueAccountPayablesUsecase,
  ) {}

  @RequirePermissions("accounts-payable.view")
  @Get()
  list(@Query() query: HttpAccountPayableListDto) {
    return this.listAccountPayables.execute(query);
  }

  @RequirePermissions("accounts-payable.mark_overdue")
  @Post("mark-overdue")
  markOverdue() {
    return this.markOverdueAccountPayables.execute();
  }
}

