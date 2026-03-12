import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("payment_methods")
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn("uuid", { name: "method_id" })
  id: string;

  @Column({ type: "varchar", length: 300 })
  name: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  number?: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;
}
