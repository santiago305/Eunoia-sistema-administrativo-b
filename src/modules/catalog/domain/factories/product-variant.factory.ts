import { Money } from "src/shared/value-objets/money.vo";
import { ProductVariant } from "../entity/product-variant";
import { ProductId } from "../value-object/product-id.vo";
import { AttributesRecord } from "../value-object/variant-attributes.vo";

export class ProductVariantFactory {
  static create(params: {
    id?: string;
    productId: ProductId;
    sku: string;
    barcode?: string | null;
    attributes?: AttributesRecord;
    price: Money;
    cost: Money;
    minStock?: number | null;
    isActive?: boolean;
    createdAt?: Date;
    customSku?: string | null;
  }) {
    return ProductVariant.create(params);
  }
}
