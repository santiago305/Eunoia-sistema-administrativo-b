import { Injectable } from "@nestjs/common";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { IncomeDataScope, IncomeDataScopeService } from "src/modules/income/application/services/income-data-scope.service";

export type SaleOrderReadContext = {
  userId: string;
  viewAll: boolean;
  includeDeleted: boolean;
  includeCustomerData: boolean;
  includeAmounts: boolean;
  includeProducts: boolean;
  /** Null when the user has no permission to read income records. */
  incomeDataScope?: IncomeDataScope | null;
  includeIncomePayments?: boolean;
};

@Injectable()
export class SaleOrderAccessPolicyService {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly incomeDataScope: IncomeDataScopeService,
  ) {}

  async resolveReadContext(userId: string): Promise<SaleOrderReadContext> {
    const permissions = new Set(await this.accessControl.getEffectivePermissions(userId));
    const allows = (code: string) => permissions.has("*") || permissions.has(code);
    let incomeDataScope: IncomeDataScope | null = null;
    let includeIncomePayments = false;
    if (allows("income.view_all") || allows("income.view_own")) {
      incomeDataScope = await this.incomeDataScope.resolve(userId);
      includeIncomePayments = true;
    }

    return {
      userId,
      viewAll: allows("sale_orders.view_all"),
      includeDeleted: allows("sale_orders.view_deleted"),
      includeCustomerData: allows("sale_orders.view_customer_data"),
      includeAmounts: allows("sale_orders.view_amounts"),
      includeProducts: allows("sale_orders.products.view"),
      incomeDataScope,
      includeIncomePayments,
    };
  }
}
