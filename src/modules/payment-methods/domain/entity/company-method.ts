import { InvalidPaymentMethodRelationError } from "../errors/invalid-payment-method-relation.error";

export class CompanyMethod {
  private constructor(
    public readonly companyMethodId: string | undefined,
    public readonly companyId: string,
    public readonly methodId: string,
    public readonly requiresVoucher: boolean = true,
    public readonly enabled: boolean = true,
  ) {}

  static create(params: {
    companyMethodId?: string;
    companyId: string;
    methodId: string;
    requiresVoucher?: boolean;
    enabled?: boolean;
  }) {
    if (!params.companyId || !params.methodId) {
      throw new InvalidPaymentMethodRelationError("company");
    }

    return new CompanyMethod(
      params.companyMethodId,
      params.companyId,
      params.methodId,
      params.requiresVoucher ?? true,
      params.enabled ?? true,
    );
  }
}
