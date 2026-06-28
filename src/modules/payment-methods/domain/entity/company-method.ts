import { InvalidPaymentMethodRelationError } from "../errors/invalid-payment-method-relation.error";

export class CompanyMethod {
  private constructor(
    public readonly companyMethodId: string | undefined,
    public readonly companyId: string,
    public readonly methodId: string,
    public readonly number?: string,
    public readonly requiresVoucher: boolean = true,
  ) {}

  static create(params: {
    companyMethodId?: string;
    companyId: string;
    methodId: string;
    number?: string | null;
    requiresVoucher?: boolean;
  }) {
    if (!params.companyId || !params.methodId) {
      throw new InvalidPaymentMethodRelationError("company");
    }

    return new CompanyMethod(
      params.companyMethodId,
      params.companyId,
      params.methodId,
      params.number?.trim() || undefined,
      params.requiresVoucher ?? true,
    );
  }
}
