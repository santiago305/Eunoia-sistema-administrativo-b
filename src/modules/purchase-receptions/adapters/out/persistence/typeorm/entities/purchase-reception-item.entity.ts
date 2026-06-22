import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";

@Entity("purchase_reception_items")
@Index("idx_purchase_reception_items_reception", ["receptionId"])
@Index("idx_purchase_reception_items_purchase_item", ["purchaseItemId"])
export class PurchaseReceptionItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "purchase_reception_item_id" })
  id: string;

  @Column({ name: "purchase_reception_id", type: "uuid" })
  receptionId: string;

  @Column({ name: "purchase_item_id", type: "uuid" })
  purchaseItemId: string;

  @Column({ name: "stock_item_id", type: "uuid", nullable: true })
  stockItemId?: string | null;

  @Column({ name: "item_type", type: "enum", enum: PurchaseItemType, enumName: "purchase_item_type" })
  itemType: PurchaseItemType;

  @Column({ name: "ordered_quantity", type: "numeric", precision: 12, scale: 3 })
  orderedQuantity: number;

  @Column({ name: "received_quantity", type: "numeric", precision: 12, scale: 3 })
  receivedQuantity: number;

  @Column({ name: "accepted_quantity", type: "numeric", precision: 12, scale: 3 })
  acceptedQuantity: number;

  @Column({ name: "rejected_quantity", type: "numeric", precision: 12, scale: 3, default: 0 })
  rejectedQuantity: number;

  @Column({ name: "affects_stock", type: "boolean", default: false })
  affectsStock: boolean;

  @Column({ name: "stock_posted", type: "boolean", default: false })
  stockPosted: boolean;

  @Column({ name: "service_confirmed", type: "boolean", default: false })
  serviceConfirmed: boolean;

  @Column({ name: "note", type: "text", nullable: true })
  note?: string | null;
}
