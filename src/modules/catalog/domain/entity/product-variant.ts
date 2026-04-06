import { Money } from '../../../../shared/value-objets/money.vo';
import { ProductId } from '../value-object/product-id.vo';
import { AttributesRecord } from '../value-object/variant-attributes.vo';
import { InvalidProductVariantError } from '../errors/invalid-product-variant.error';
export class ProductVariant {
  private constructor(
    private readonly id: string | undefined,
    private readonly productId: ProductId,
    private readonly sku: string,
    private readonly barcode: string | null,
    private readonly attributes: AttributesRecord,
    private readonly price: Money,
    private readonly cost: Money,
    private readonly isActive: boolean,
    private readonly createdAt: Date,
    private readonly customSku?: string | null,
  ) {
    if (!sku?.trim()) throw new InvalidProductVariantError("El SKU de la variante es obligatorio");
  }

  static create(params: {
    id?: string;
    productId: ProductId;
    sku: string;
    barcode?: string | null;
    attributes?: AttributesRecord;
    price: Money;
    cost: Money;
    isActive?: boolean;
    createdAt?: Date;
    customSku?: string | null;
  }) {
    const sku = params.sku?.trim();
    if (!sku) throw new InvalidProductVariantError("El SKU de la variante es obligatorio");

    return new ProductVariant(
      params.id,
      params.productId,
      sku,
      params.barcode?.trim() || null,
      params.attributes ?? {},
      params.price,
      params.cost,
      params.isActive ?? true,
      params.createdAt ?? new Date(),
      params.customSku?.trim() || null,
    );
  }

  getId(): string {
    if (!this.id) {
      throw new Error("ProductVariant id is not assigned");
    }
    return this.id;
  }
  getProductId(): ProductId { return this.productId; }
  getSku(): string { return this.sku; }
  getCustomSku(): string | null | undefined { return this.customSku; }
  getBarcode(): string | null { return this.barcode; }
  getAttributes(): AttributesRecord { return this.attributes; }
  getPrice(): Money { return this.price; }
  getCost(): Money { return this.cost; }
  getIsActive(): boolean { return this.isActive; }
  getCreatedAt(): Date { return this.createdAt; }
}
