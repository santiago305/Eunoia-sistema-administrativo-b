import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";
import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";

@Entity("purchase_order_items")
@Index("idx_purchase_order_items_po", ["poId"])
export class PurchaseOrderItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "po_item_id" })
  id: string;

  @Column({ name: "po_id", type: "uuid" })
  poId: string;

  @Column({ name: "stock_item_id", type: "uuid", nullable: true })
  stockItemId?: string | null;

  @Column({ name: "item_type", type: "enum", enum: PurchaseItemType, enumName: "purchase_item_type", default: PurchaseItemType.PRODUCT })
  itemType: PurchaseItemType;

  @Column({ name: "internal_material_id", type: "uuid", nullable: true })
  internalMaterialId?: string | null;

  @Column({ name: "asset_category_id", type: "uuid", nullable: true })
  assetCategoryId?: string | null;

  @Column({ name: "service_name", type: "varchar", nullable: true })
  serviceName?: string | null;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "warehouse_id", type: "uuid", nullable: true })
  warehouseId?: string | null;

  @Column({ name: "affects_stock", type: "boolean", default: true })
  affectsStock: boolean;

  @Column({ name: "generates_asset", type: "boolean", default: false })
  generatesAsset: boolean;

  @Column({ name: "is_service", type: "boolean", default: false })
  isService: boolean;

  @Column({ name: "is_subscription", type: "boolean", default: false })
  isSubscription: boolean;

  @Column({ name: "unit_base", type: "varchar", nullable: true })
  unitBase?: string | null;

  @Column({ name: "equivalence", type: "varchar", nullable: true })
  equivalencia?: string | null;

  @Column({ name: "factor", type: "numeric", precision: 12, scale: 4, nullable: true })
  factor?: number | null;

  @Column({ name: "afect_type", type: "enum", enum: AfectIgvType, enumName: "afect_igv_type" })
  afectType: AfectIgvType;

  @Column({ name: "quantity", type: "numeric", precision:12, scale: 3})
  quantity: number;

  @Column({ name: "porcentage_igv", type: "numeric" })
  porcentageIgv: number;

  @Column({ name: "base_without_igv", type: "numeric", precision: 12, scale: 2 })
  baseWithoutIgv: number;

  @Column({ name: "amount_igv", type: "numeric", precision: 12, scale: 2 })
  amountIgv: number;

  @Column({ name: "unit_value", type: "numeric", precision: 12, scale: 4 })
  unitValue: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 4 })
  unitPrice: number;

  @Column({ name: "purchase_value", type: "numeric", precision: 12, scale: 2 })
  purchaseValue: number;
}
