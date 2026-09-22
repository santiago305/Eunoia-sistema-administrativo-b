import { InvalidPaymentMethodRelationError } from "../errors/invalid-payment-method-relation.error";
import type { CompanyMethodEvidencePolicy } from "../services/payment-method-voucher-policy";

export class CompanyMethod {
  private constructor(
    public readonly companyMethodId: string | undefined,
    public readonly companyId: string,
    public readonly methodId: string,
    public readonly evidencePolicy: CompanyMethodEvidencePolicy = "INHERIT",
    public readonly enabled: boolean = true,
  ) {}

  static create(params: {
    companyMethodId?: string;
    companyId: string;
    methodId: string;
    evidencePolicy?: CompanyMethodEvidencePolicy;
    enabled?: boolean;
  }) {
    if (!params.companyId || !params.methodId) {
      throw new InvalidPaymentMethodRelationError("company");
    }

    return new CompanyMethod(
      params.companyMethodId,
      params.companyId,
      params.methodId,
      params.evidencePolicy ?? "INHERIT",
      params.enabled ?? true,
    );
  }
}
