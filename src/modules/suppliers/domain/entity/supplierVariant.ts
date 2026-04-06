import { Money } from "src/shared/value-objets/money.vo";
import { InvalidSupplierVariantError } from "../errors/invalid-supplier-variant.error";

export class SupplierVariant {
  private constructor(
    public readonly supplierId: string,
    public readonly variantId: string,
    public readonly supplierSku?: string,
    public readonly lastCost?: Money,
    public readonly leadTimeDays?: number,
  ) {}

  static create(params: {
    supplierId: string;
    variantId: string;
    supplierSku?: string;
    lastCost?: Money;
    leadTimeDays?: number;
  }) {
    if (!params.supplierId || !params.variantId) {
      throw new InvalidSupplierVariantError();
    }
    if (params.leadTimeDays !== undefined && params.leadTimeDays < 0) {
      throw new InvalidSupplierVariantError("El tiempo de entrega del proveedor-variante es invalido");
    }

    return new SupplierVariant(
      params.supplierId,
      params.variantId,
      params.supplierSku?.trim() || undefined,
      params.lastCost,
      params.leadTimeDays,
    );
  }
}
