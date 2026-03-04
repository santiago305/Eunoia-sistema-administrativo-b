import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";

@Entity("purchase_order_items")
@Index("idx_purchase_order_items_po", ["poId"])
export class PurchaseOrderItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "po_item_id" })
  id: string;

  @Column({ name: "po_id", type: "uuid" })
  poId: string;

  @Column({ name: "stock_item_id", type: "uuid" })
  stockItemId: string;

  @Column({ name: "unit_base", type: "varchar", nullable: true })
  unitBase?: string | null;

  @Column({ name: "equivalence", type: "varchar", nullable: true })
  equivalencia?: string | null;

  @Column({ name: "factor", type: "int", nullable: true })
  factor?: number | null;

  @Column({ name: "afect_type", type: "enum", enum: AfectIgvType, enumName: "afect_igv_type" })
  afectType: AfectIgvType;

  @Column({ name: "quantity", type: "int" })
  quantity: number;

  @Column({ name: "porcentage_igv", type: "numeric" })
  porcentageIgv: number;

  @Column({ name: "base_without_igv", type: "numeric", precision: 12, scale: 2 })
  baseWithoutIgv: number;

  @Column({ name: "amount_igv", type: "numeric", precision: 12, scale: 2 })
  amountIgv: number;

  @Column({ name: "unit_value", type: "numeric", precision: 12, scale: 2 })
  unitValue: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ name: "purchase_value", type: "numeric", precision: 12, scale: 2 })
  purchaseValue: number;
}
