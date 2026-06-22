import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchasePaymentStatus } from "src/modules/purchases/domain/value-objects/purchase-payment-status";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { ReceptionStatus } from "src/modules/purchases/domain/value-objects/reception-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

@Entity("purchase_orders")
@Index("uq_po_doc", ["documentType", "serie", "correlative"], { unique: true })
export class PurchaseOrderEntity {
  @PrimaryGeneratedColumn("uuid", { name: "po_id" })
  id: string;

  @Column({ name: "supplier_id", type: "uuid" })
  supplierId: string;

  @Column({ name: "warehouse_id", type: "uuid", nullable: true })
  warehouseId?: string | null;

  @Column({ name: "document_type", type: "enum", enum: VoucherDocType, enumName: "voucher_doc_type", nullable: true })
  documentType?: VoucherDocType | null;

  @Column({ name: "serie", type: "varchar", nullable: true })
  serie?: string | null;

  @Column({ name: "correlative", type: "int", nullable: true })
  correlative?: number | null;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type", nullable: true })
  currency?: CurrencyType | null;

  @Column({ name: "payment_form", type: "enum", enum: PaymentFormType, enumName: "payment_form_type", nullable: true })
  paymentForm?: PaymentFormType | null;


  @Column({ name: "credit_days", type: "int", default: 0 })
  creditDays: number;

  @Column({ name: "num_quotas", type: "int", default: 0 })
  numQuotas: number;

  @Column({ name: "total_taxed", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalTaxed: number;

  @Column({ name: "total_exempted", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalExempted: number;

  @Column({ name: "total_igv", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalIgv: number;

  @Column({ name: "purchase_value", type: "numeric", precision: 12, scale: 2, default: 0 })
  purchaseValue: number;

  @Column({ name: "total", type: "numeric", precision: 12, scale: 2})
  total: number;

  @Column({ name: "note", type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "status", type: "enum", enum: PurchaseOrderStatus, enumName: "po_status", default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ name: "purchase_type", type: "enum", enum: PurchaseType, enumName: "purchase_type", default: PurchaseType.INVENTORY })
  purchaseType: PurchaseType;

  @Column({ name: "reception_status", type: "enum", enum: ReceptionStatus, enumName: "purchase_reception_status", default: ReceptionStatus.PENDING })
  receptionStatus: ReceptionStatus;

  @Column({ name: "payment_status", type: "enum", enum: PurchasePaymentStatus, enumName: "purchase_payment_status", default: PurchasePaymentStatus.PENDING })
  paymentStatus: PurchasePaymentStatus;

  @Column({ name: "requested_by_user_id", type: "uuid", nullable: true })
  requestedByUserId?: string | null;

  @Column({ name: "approved_by_user_id", type: "uuid", nullable: true })
  approvedByUserId?: string | null;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt?: Date | null;

  @Column({ name: "rejected_by_user_id", type: "uuid", nullable: true })
  rejectedByUserId?: string | null;

  @Column({ name: "rejected_at", type: "timestamptz", nullable: true })
  rejectedAt?: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason?: string | null;

  @Column({ name: "is_recurring_source", type: "boolean", default: false })
  isRecurringSource: boolean;

  @Column({ name: "recurring_template_id", type: "uuid", nullable: true })
  recurringTemplateId?: string | null;

  @Column({ name: "requires_receipt", type: "boolean", default: true })
  requiresReceipt: boolean;

  @Column({ name: "requires_stock_entry", type: "boolean", default: true })
  requiresStockEntry: boolean;

  @Column({ name: "requires_asset_creation", type: "boolean", default: false })
  requiresAssetCreation: boolean;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "expected_at", type: "timestamptz", nullable: true })
  expectedAt?: Date | null;

  @Column({ name: "date_issue", type: "timestamptz", nullable: true })
  dateIssue?: Date | null;

  @Column({ name: "date_expiration", type: "timestamptz", nullable: true })
  dateExpiration?: Date | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy?: string | null;

  @Column({ name: "approval_status", type: "varchar", length: 20, default: "NOT_REQUIRED" })
  approvalStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

  @Column({ name: "image_prodution", type: "jsonb", default: () => "'[]'" })
  imageProdution: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
