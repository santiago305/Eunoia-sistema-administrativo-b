import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Direction } from "src/shared/domain/value-objects/direction";

@Entity("pc_inventory_ledger")
export class ProductCatalogInventoryLedgerEntity {
  @PrimaryGeneratedColumn("uuid", { name: "ledger_id" })
  id: string;

  @Column({ name: "doc_id", type: "uuid" })
  docId: string;

  @Column({ name: "doc_item_id", type: "uuid", nullable: true })
  docItemId: string | null;

  @Column({ name: "warehouse_id", type: "uuid" })
  warehouseId: string;

  @Column({ name: "location_id", type: "uuid", nullable: true })
  locationId: string | null;

  @Column({ name: "stock_item_id", type: "uuid" })
  stockItemId: string;

  @Column({ name: "direction", type: "enum", enum: Direction, enumName: "inv_direction" })
  direction: Direction;

  @Column({ name: "quantity", type: "int" })
  quantity: number;

  @Column({ name: "waste_qty", type: "numeric", precision: 12, scale: 6, default: 0 })
  wasteQty: number | null;

  @Column({ name: "unit_cost", type: "numeric", precision: 12, scale: 2, nullable: true })
  unitCost: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

