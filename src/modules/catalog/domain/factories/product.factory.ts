import { Money } from "src/shared/value-objets/money.vo";
import { Product } from "../entity/product";
import { ProductType } from "../value-object/productType";
import { AttributesRecord } from "../value-object/variant-attributes.vo";
import { ProductId } from "../value-object/product-id.vo";

export class ProductFactory {
  static create(params: {
    id?: ProductId;
    baseUnitId: string;
    name: string;
    description?: string | null;
    sku: string;
    barcode?: string | null;
    price: Money;
    cost: Money;
    minStock?: number | null;
    attributes?: AttributesRecord;
    isActive?: boolean;
    type: ProductType;
    createdAt?: Date;
    updatedAt?: Date | null;
    customSku?: string | null;
  }) {
    return Product.create(params);
  }
}
