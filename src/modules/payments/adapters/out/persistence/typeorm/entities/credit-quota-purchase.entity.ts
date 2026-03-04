import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("credit_quota_purchases")
@Index("idx_quota_purchases_po", ["poId"])
export class CreditQuotaPurchaseEntity {
  @PrimaryColumn({ name: "quota_id", type: "uuid" })
  quotaId: string;

  @Column({ name: "po_id", type: "uuid" })
  poId: string;
}
