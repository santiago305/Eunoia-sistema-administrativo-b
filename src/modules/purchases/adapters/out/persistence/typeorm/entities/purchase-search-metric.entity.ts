import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PurchaseSearchSnapshot } from "src/modules/purchases/application/dtos/purchase-search/purchase-search-snapshot";

@Entity("purchase_search_metrics")
@Index("idx_purchase_search_metrics_user_table", ["userId", "tableKey"])
export class PurchaseSearchMetricEntity {
  @PrimaryGeneratedColumn("uuid", { name: "metric_id" })
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "table_key", type: "varchar", length: 80 })
  tableKey: string;

  @Column({ type: "varchar", length: 120 })
  name: string;

  @Column({ type: "jsonb" })
  snapshot: PurchaseSearchSnapshot;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
