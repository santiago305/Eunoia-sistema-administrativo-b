import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("payment_purchase")
@Index("idx_payment_purchase_po", ["poId"])
@Index("idx_payment_purchase_quota", ["quotaId"])
export class PaymentPurchaseEntity {
  @PrimaryColumn({ name: "pay_doc_id", type: "uuid" })
  payDocId: string;

  @Column({ name: "po_id", type: "uuid" })
  poId: string;

  @Column({ name: "quota_id", type: "uuid", nullable: true })
  quotaId?: string | null;
}
