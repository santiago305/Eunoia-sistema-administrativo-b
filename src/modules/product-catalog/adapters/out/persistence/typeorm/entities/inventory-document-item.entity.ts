import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("pc_inventory_document_items")
@Index("idx_pc_inv_doc_items_doc", ["docId"])
@Index("idx_pc_inv_doc_items_stock_item", ["stockItemId"])
export class ProductCatalogInventoryDocumentItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "item_id" })
  id: string;

  @Column({ name: "doc_id", type: "uuid" })
  docId: string;

  @Column({ name: "stock_item_id", type: "uuid" })
  stockItemId: string;

  @Column({ name: "from_location_id", type: "uuid", nullable: true })
  fromLocationId: string | null;

  @Column({ name: "to_location_id", type: "uuid", nullable: true })
  toLocationId: string | null;

  @Column({ name: "quantity", type: "int" })
  quantity: number;

  @Column({ name: "waste_qty", type: "numeric", precision: 12, scale: 6, default: 0 })
  wasteQty: number;

  @Column({ name: "unit_cost", type: "numeric", precision: 12, scale: 2, nullable: true })
  unitCost: number | null;
}
