import { InvalidPaymentMethodRelationError } from "../errors/invalid-payment-method-relation.error";

export class SupplierMethod {
  private constructor(
    public readonly supplierId: string,
    public readonly methodId: string,
    public readonly number?: string,
  ) {}

  static create(params: { supplierId: string; methodId: string; number?: string }) {
    if (!params.supplierId || !params.methodId) {
      throw new InvalidPaymentMethodRelationError("supplier");
    }

    return new SupplierMethod(
      params.supplierId,
      params.methodId,
      params.number?.trim() || undefined,
    );
  }
}
