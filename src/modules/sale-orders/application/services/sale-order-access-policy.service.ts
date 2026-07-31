import { Injectable } from "@nestjs/common";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";

export type SaleOrderReadContext = {
  userId: string;
  viewAll: boolean;
  includeDeleted: boolean;
  includeCustomerData: boolean;
  includeAmounts: boolean;
  includeProducts: boolean;
};

@Injectable()
export class SaleOrderAccessPolicyService {
  constructor(private readonly accessControl: AccessControlService) {}

  async resolveReadContext(userId: string): Promise<SaleOrderReadContext> {
    const permissions = new Set(await this.accessControl.getEffectivePermissions(userId));
    const allows = (code: string) => permissions.has("*") || permissions.has(code);

    return {
      userId,
      viewAll: allows("sale_orders.view_all"),
      includeDeleted: allows("sale_orders.view_deleted"),
      includeCustomerData: allows("sale_orders.view_customer_data"),
      includeAmounts: allows("sale_orders.view_amounts"),
      includeProducts: allows("sale_orders.products.view"),
    };
  }
}
