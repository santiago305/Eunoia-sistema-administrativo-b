import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("payment_methods")
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn("uuid", { name: "method_id" })
  id: string;

  @Column({ type: "varchar", length: 300 })
  name: string;

  @Column({ type: "varchar", length: 50, unique: true })
  code: string;

  @Column({ type: "varchar", length: 40, default: "OTHER" })
  category: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "requires_voucher", type: "boolean", default: true })
  requiresVoucher: boolean;

  @Column({ name: "requires_source_account", type: "boolean", default: true })
  requiresSourceAccount: boolean;

  @Column({ name: "requires_destination", type: "boolean", default: false })
  requiresDestination: boolean;

  @Column({ name: "requires_operation_reference", type: "boolean", default: true })
  requiresOperationReference: boolean;

  @Column({ name: "is_system", type: "boolean", default: false })
  isSystem: boolean;
}
