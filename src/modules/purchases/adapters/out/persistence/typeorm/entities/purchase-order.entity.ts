import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

@Entity("purchase_orders")
@Index("uq_po_doc", ["documentType", "serie", "correlative"], { unique: true })
export class PurchaseOrderEntity {
  @PrimaryGeneratedColumn("uuid", { name: "po_id" })
  id: string;

  @Column({ name: "supplier_id", type: "uuid" })
  supplierId: string;

  @Column({ name: "warehouse_id", type: "uuid" })
  warehouseId: string;

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

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "expected_at", type: "timestamptz", nullable: true })
  expectedAt?: Date | null;

  @Column({ name: "date_issue", type: "timestamptz", nullable: true })
  dateIssue?: Date | null;

  @Column({ name: "date_expiration", type: "timestamptz", nullable: true })
  dateExpiration?: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
