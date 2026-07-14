import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { AdminFinanceFilterInput } from "../../../application/dtos/admin-finance-filter.input";
import { GetAdminFinanceSummaryUsecase } from "../../../application/usecases/get-admin-finance-summary.usecase";
import { ListAdminFinanceMovementsUsecase } from "../../../application/usecases/list-admin-finance-movements.usecase";

@Controller("admin-finance")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFinanceController {
  constructor(
    private readonly summary: GetAdminFinanceSummaryUsecase,
    private readonly movements: ListAdminFinanceMovementsUsecase,
  ) {}

  @Get("summary")
  @RequirePermissions("admin_finance.read")
  getSummary(@Query() query: AdminFinanceFilterInput) {
    return this.summary.execute(query);
  }

  @Get("movements")
  @RequirePermissions("admin_finance.read")
  listMovements(@Query() query: AdminFinanceFilterInput) {
    return this.movements.execute(query);
  }
}
