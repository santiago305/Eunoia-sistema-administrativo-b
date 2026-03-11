import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";

@Entity("credit_quotas")
@Index("idx_credit_quotas_po", ["poId"])
export class CreditQuotaEntity {
  @PrimaryGeneratedColumn("uuid", { name: "quota_id" })
  id: string;

  @Column({ name: "number", type: "int" })
  number: number;

  @Column({ name: "expiration_date", type: "date" })
  expirationDate: Date;

  @Column({ name: "payment_date", type: "timestamptz", nullable: true })
  paymentDate?: Date | null;

  @Column({ name: "total_to_pay", type: "numeric", precision: 12, scale: 2 })
  totalToPay: number;

  @Column({ name: "total_paid", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalPaid: number;

  @Column({ name: "from_document_type", type: "enum", enum: PayDocType, enumName: "pay_doc_type" })
  fromDocumentType: PayDocType;

  @Column({ name: "po_id", type: "uuid", nullable: true })
  poId?: string | null;

  @ManyToOne(() => PurchaseOrderEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "po_id" })
  purchaseOrder?: PurchaseOrderEntity | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
