import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { SaleOrderEntity } from "./sale-order.entity";

export type SaleOrderAuditAction = "delete" | "restore" | "preguide_on" | "preguide_off" | "prepared_on" | "prepared_off";

@Entity("sale_order_auditory")
export class SaleOrderAuditEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_id", type: "uuid" })
  saleOrderId: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "timezone('America/Lima', CURRENT_TIMESTAMP)",
  })
  createdAt: Date;

  @Column({ name: "executed_by", type: "uuid" })
  executedBy: string;

  @Column({ name: "action_execution", type: "varchar", length: 20 })
  actionExecution: SaleOrderAuditAction;

  @ManyToOne(() => SaleOrderEntity, { nullable: false })
  @JoinColumn({ name: "sale_order_id" })
  saleOrder?: SaleOrderEntity;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "executed_by", referencedColumnName: "id" })
  executor?: User;
}
