import { InvalidPaymentMethodRelationError } from "../errors/invalid-payment-method-relation.error";

export class SupplierMethod {
  private constructor(
    public readonly supplierMethodId: string | undefined,
    public readonly supplierId: string,
    public readonly methodId: string,
    public readonly number?: string,
    public readonly isDefault: boolean = false,
  ) {}

  static create(params: {
    supplierMethodId?: string;
    supplierId: string;
    methodId: string;
    number?: string | null;
    isDefault?: boolean;
  }) {
    if (!params.supplierId || !params.methodId) {
      throw new InvalidPaymentMethodRelationError("supplier");
    }

    return new SupplierMethod(
      params.supplierMethodId,
      params.supplierId,
      params.methodId,
      params.number?.trim() || undefined,
      params.isDefault ?? false,
    );
  }
}
