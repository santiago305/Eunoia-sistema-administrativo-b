import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { PurchaseSearchSnapshot } from "src/modules/purchases/application/dtos/purchase-search/purchase-search-snapshot";

@Entity("purchase_search_recent")
@Index("idx_purchase_search_recent_user_table", ["userId", "tableKey"])
@Index("uq_purchase_search_recent_user_table_hash", ["userId", "tableKey", "snapshotHash"], { unique: true })
export class PurchaseSearchRecentEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recent_search_id" })
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "table_key", type: "varchar", length: 80 })
  tableKey: string;

  @Column({ name: "snapshot_hash", type: "varchar", length: 64 })
  snapshotHash: string;

  @Column({ type: "jsonb" })
  snapshot: PurchaseSearchSnapshot;

  @Column({ name: "last_used_at", type: "timestamptz" })
  lastUsedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
