import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { PurchaseReceptionStatus } from "src/modules/purchase-receptions/domain/entity/purchase-reception";

@Entity("purchase_receptions")
@Index("idx_purchase_receptions_purchase", ["purchaseId", "createdAt"])
export class PurchaseReceptionEntity {
  @PrimaryGeneratedColumn("uuid", { name: "purchase_reception_id" })
  id: string;

  @Column({ name: "purchase_id", type: "uuid" })
  purchaseId: string;

  @Column({ name: "warehouse_id", type: "uuid", nullable: true })
  warehouseId?: string | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "DRAFT" })
  status: PurchaseReceptionStatus;

  @Column({ name: "received_by_user_id", type: "uuid", nullable: true })
  receivedByUserId?: string | null;

  @Column({ name: "received_at", type: "timestamptz", nullable: true })
  receivedAt?: Date | null;

  @Column({ name: "note", type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "evidence_urls", type: "jsonb", default: () => "'[]'" })
  evidenceUrls: string[];

  @Column({ name: "inventory_document_id", type: "uuid", nullable: true })
  inventoryDocumentId?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
