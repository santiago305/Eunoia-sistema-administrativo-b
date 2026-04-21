import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ListingSearchSnapshot } from "src/shared/listing-search/domain/listing-search-snapshot";

@Entity("purchase_search_recent")
@Index("idx_purchase_search_recent_user_table", ["userId", "tableKey"])
@Index("uq_purchase_search_recent_user_table_hash", ["userId", "tableKey", "snapshotHash"], { unique: true })
export class ListingSearchRecentEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recent_search_id" })
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "table_key", type: "varchar", length: 80 })
  tableKey: string;

  @Column({ name: "snapshot_hash", type: "varchar", length: 64 })
  snapshotHash: string;

  @Column({ type: "jsonb" })
  snapshot: ListingSearchSnapshot;

  @Column({ name: "last_used_at", type: "timestamptz" })
  lastUsedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
