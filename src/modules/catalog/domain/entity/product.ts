import { Money } from '../../../../shared/value-objets/money.vo';
import { ProductId } from '../value-object/product-id.vo';
import { ProductType } from '../value-object/productType';
import { AttributesRecord } from '../value-object/variant-attributes.vo';
import { InvalidProductError } from '../errors/invalid-product.error';


export class Product {
  private constructor(
    private id: ProductId | undefined,
    private baseUnitId: string,
    private name: string,
    private description: string | null,
    private sku: string,
    private barcode: string | null,
    private price: Money,
    private cost: Money,
    private minStock: number | null,
    private attributes: AttributesRecord,
    private isActive: boolean = true,
    private type: ProductType,
    private createdAt?: Date,
    private updatedAt?: Date,
    private customSku?: string | null,
  ) {
    if (!name?.trim()) throw new InvalidProductError("El nombre del producto es obligatorio");
  }

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
    const name = params.name?.trim();
    const baseUnitId = params.baseUnitId?.trim();
    const sku = params.sku?.trim();

    if (!name) throw new InvalidProductError("El nombre del producto es obligatorio");
    if (!baseUnitId) throw new InvalidProductError("La unidad base es obligatoria");
    if (!sku) throw new InvalidProductError("El SKU del producto es obligatorio");

    return new Product(
      params.id,
      baseUnitId,
      name,
      params.description?.trim() || null,
      sku,
      params.barcode?.trim() || null,
      params.price,
      params.cost,
      params.minStock ?? null,
      params.attributes ?? {},
      params.isActive ?? true,
      params.type,
      params.createdAt,
      params.updatedAt ?? undefined,
      params.customSku?.trim() || null,
    );
  }

  getId() { return this.id; }
  getBaseUnitId() { return this.baseUnitId; }
  getName() { return this.name; }
  getDescription() { return this.description; }
  getSku() { return this.sku; }
  getBarcode() { return this.barcode; }
  getPrice() { return this.price; }
  getCost() { return this.cost; }
  getMinStock() { return this.minStock; }
  getAttributes() { return this.attributes; }
  getIsActive() { return this.isActive; }
  getType() { return this.type; }
  getCustomSku() { return this.customSku; }
  getCreatedAt() { return this.createdAt; }
  getUpdatedAt() { return this.updatedAt; }
}
