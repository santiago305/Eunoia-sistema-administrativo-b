import { Money } from '../value-object/money.vo';
import { ProductId } from '../value-object/product-id.vo';
import { ProductType } from '../value-object/productType';
import { AttributesRecord } from '../value-object/variant-attributes.vo';


export class Product {
  constructor(
    private id: ProductId | undefined,
    private baseUnitId: string,
    private name: string,
    private description: string | null,
    private sku: string,
    private barcode: string | null,
    private price: Money,
    private cost: Money,
    private attributes: AttributesRecord,
    private isActive: boolean = true,
    private type: ProductType,
    private createdAt?: Date,
    private updatedAt?: Date,
  ) {
    if (!name?.trim()) throw new Error("Product name is required");
  }

  getId() { return this.id; }
  getBaseUnitId() { return this.baseUnitId; }
  getName() { return this.name; }
  getDescription() { return this.description; }
  getSku() { return this.sku; }
  getBarcode() { return this.barcode; }
  getPrice() { return this.price; }
  getCost() { return this.cost; }
  getAttributes() { return this.attributes; }
  getIsActive() { return this.isActive; }
  getType() { return this.type; }
  getCreatedAt() { return this.createdAt; }
  getUpdatedAt() { return this.updatedAt; }
}
