import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { CreditQuotaEntity } from "./credit-quota.entity";

@Entity("payment_documents")
@Index("idx_payment_documents_po", ["poId"])
@Index("idx_payment_documents_quota", ["quotaId"])
export class PaymentDocumentEntity {
  @PrimaryGeneratedColumn("uuid", { name: "pay_doc_id" })
  id: string;

  @Column({ name: "method", type: "varchar", length: 300 })
  method: string;

  @Column({ name: "date", type: "timestamptz" })
  date: Date;

  @Column({ name: "operation_number", type: "varchar", length: 60, nullable: true })
  operationNumber?: string | null;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type" })
  currency: CurrencyType;

  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "note", type: "varchar", length: 225, nullable: true })
  note?: string | null;

  @Column({ name: "from_document_type", type: "enum", enum: PayDocType, enumName: "pay_doc_type" })
  fromDocumentType: PayDocType;

  @Column({ name: "po_id", type: "uuid", nullable: true })
  poId?: string | null;

  @ManyToOne(() => PurchaseOrderEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "po_id" })
  purchaseOrder?: PurchaseOrderEntity | null;

  @Column({ name: "quota_id", type: "uuid", nullable: true })
  quotaId?: string | null;

  @Column({ name: "status", type: "varchar", length: 30, default: "APPROVED" })
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

  @Column({ name: "requested_by_user_id", type: "uuid", nullable: true })
  requestedByUserId?: string | null;

  @Column({ name: "approved_by_user_id", type: "uuid", nullable: true })
  approvedByUserId?: string | null;

  @Column({ name: "rejected_by_user_id", type: "uuid", nullable: true })
  rejectedByUserId?: string | null;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt?: Date | null;

  @Column({ name: "rejected_at", type: "timestamptz", nullable: true })
  rejectedAt?: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason?: string | null;

  @ManyToOne(() => CreditQuotaEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "quota_id" })
  creditQuota?: CreditQuotaEntity | null;
}
