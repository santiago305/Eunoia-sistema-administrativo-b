import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

@Entity("sale_payments")
@Index("idx_sale_payments_sale_order", ["saleOrderId"])
export class SalePaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_id", type: "uuid" })
  saleOrderId: string;

  @Column({ name: "company_payment_account_id", type: "uuid", nullable: true })
  companyPaymentAccountId?: string | null;

  @Column({ name: "payment_method_id", type: "uuid", nullable: true })
  paymentMethodId?: string | null;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type", default: CurrencyType.PEN })
  currency: CurrencyType;

  @Column({ name: "status", type: "varchar", length: 20, default: "POSTED" })
  status: "DRAFT" | "POSTED" | "VOIDED";

  @Column({ name: "operation_code", type: "varchar", length: 80, nullable: true })
  operationCode?: string | null;

  @Column({ name: "voided_at", type: "timestamptz", nullable: true })
  voidedAt?: Date | null;

  @Column({ name: "voided_by_user_id", type: "uuid", nullable: true })
  voidedByUserId?: string | null;

  @Column({ name: "void_reason", type: "text", nullable: true })
  voidReason?: string | null;

  @Column({ name: "date", type: "timestamptz" })
  date: Date;

  @Column({ name: "method", type: "varchar", length: 100 })
  method: string;

  @Column({ name: "operation_number", type: "varchar", length: 100, nullable: true })
  operationNumber?: string | null;

  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "note", type: "varchar", length: 255, nullable: true })
  note?: string | null;

  @Column({ name: "payment_photo", type: "varchar", nullable: true })
  paymentPhoto?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
