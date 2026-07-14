import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { IncomeFilterInput } from "../../../application/dtos/income-filter.input";
import { GetIncomeSummaryUsecase } from "../../../application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "../../../application/usecases/list-income.usecase";

@Controller("income")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class IncomeController {
  constructor(
    private readonly listIncome: ListIncomeUsecase,
    private readonly getSummary: GetIncomeSummaryUsecase,
  ) {}

  @RequirePermissions("income.read")
  @Get()
  list(@Query() query: IncomeFilterInput) {
    return this.listIncome.execute(query);
  }

  @RequirePermissions("income.read")
  @Get("summary")
  summary(@Query() query: IncomeFilterInput) {
    return this.getSummary.execute(query);
  }
}
