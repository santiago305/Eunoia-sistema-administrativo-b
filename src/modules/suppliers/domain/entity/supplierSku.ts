import { Money } from "src/shared/value-objets/money.vo";
import { InvalidSupplierSkuError } from "../errors/invalid-supplier-sku.error";

export class SupplierSku {
  private constructor(
    public readonly supplierId: string,
    public readonly skuId: string,
    public readonly supplierSku?: string,
    public readonly lastCost?: Money,
    public readonly leadTimeDays?: number,
  ) {}

  static create(params: {
    supplierId: string;
    skuId: string;
    supplierSku?: string;
    lastCost?: Money;
    leadTimeDays?: number;
  }) {
    if (!params.supplierId || !params.skuId) {
      throw new InvalidSupplierSkuError("La relacion proveedor-sku es invalida");
    }
    if (params.leadTimeDays !== undefined && params.leadTimeDays < 0) {
      throw new InvalidSupplierSkuError("El tiempo de entrega del proveedor-sku es invalido");
    }

    return new SupplierSku(
      params.supplierId,
      params.skuId,
      params.supplierSku?.trim() || undefined,
      params.lastCost,
      params.leadTimeDays,
    );
  }
}
