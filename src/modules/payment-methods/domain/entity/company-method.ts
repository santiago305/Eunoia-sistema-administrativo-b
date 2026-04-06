import { InvalidPaymentMethodRelationError } from "../errors/invalid-payment-method-relation.error";

export class CompanyMethod {
  private constructor(
    public readonly companyId: string,
    public readonly methodId: string,
    public readonly number?: string,
  ) {}

  static create(params: { companyId: string; methodId: string; number?: string }) {
    if (!params.companyId || !params.methodId) {
      throw new InvalidPaymentMethodRelationError("company");
    }

    return new CompanyMethod(
      params.companyId,
      params.methodId,
      params.number?.trim() || undefined,
    );
  }
}
