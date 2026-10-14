import { BadRequestException, CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { IncomeDataScopeService } from "../../../application/services/income-data-scope.service";

@Injectable()
export class IncomeResourceScopeGuard implements CanActivate {
  constructor(private readonly incomeScope: IncomeDataScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const params = request.params ?? {};
    const body = request.body ?? {};
    const incomeIds = Array.isArray(body.payments)
      ? body.payments.map((payment: { id?: unknown }) => String(payment?.id ?? "")).filter(Boolean)
      : Array.isArray(body.incomeIds)
        ? body.incomeIds.map(String).filter(Boolean)
        : [];
    const hasResource = Boolean(params.incomeId || params.refundId || params.clientId || body.clientId || body.saleOrderId || body.targetSaleOrderId || body.companyPaymentAccountId || body.bankStatementLineId || incomeIds.length);
    if (!hasResource) return true;

    const resourceIds = [params.incomeId, params.refundId, params.clientId, body.clientId, body.saleOrderId, body.targetSaleOrderId, body.companyPaymentAccountId, body.bankStatementLineId, ...incomeIds].filter(Boolean).map(String);
    if (resourceIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      throw new BadRequestException("El identificador del recurso financiero no es válido.");
    }

    const userId = request.user?.id ?? request.user?.sub;
    if (!userId) return false;
    const scope = await this.incomeScope.resolve(userId);
    if (params.incomeId) await this.incomeScope.assertCanReadIncome(params.incomeId, scope);
    if (params.refundId) await this.incomeScope.assertCanReadRefund(params.refundId, scope);
    if (params.clientId) await this.incomeScope.assertCanReadClient(params.clientId, scope);
    if (body.clientId) await this.incomeScope.assertCanReadClient(String(body.clientId), scope);
    if (body.saleOrderId) await this.incomeScope.assertCanReadSaleOrder(String(body.saleOrderId), scope);
    if (body.targetSaleOrderId) await this.incomeScope.assertCanReadSaleOrder(String(body.targetSaleOrderId), scope);
    if (body.companyPaymentAccountId) await this.incomeScope.assertCanReadAccount(String(body.companyPaymentAccountId), scope);
    if (body.bankStatementLineId) await this.incomeScope.assertCanReadStatementLine(String(body.bankStatementLineId), scope);
    if (incomeIds.length) await this.incomeScope.assertCanReadIncomes(incomeIds, scope);
    return true;
  }
}
