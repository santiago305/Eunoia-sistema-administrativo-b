import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

@Entity("payment_allocations")
@Index("uq_payment_allocations_payment_payable", ["paymentId", "accountPayableId"], { unique: true })
@Index("idx_payment_allocations_payable", ["accountPayableId"])
export class PaymentAllocationEntity {
  @PrimaryGeneratedColumn("uuid", { name: "allocation_id" }) id: string;
  @Column({ name: "payment_id", type: "uuid" }) paymentId: string;
  @Column({ name: "account_payable_id", type: "uuid" }) accountPayableId: string;
  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 }) amount: number;
  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type" }) currency: CurrencyType;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt: Date;
}
