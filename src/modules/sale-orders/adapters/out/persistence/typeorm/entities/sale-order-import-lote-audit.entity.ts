import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { SaleOrderImportLoteEntity } from "./sale-order-import-lote.entity";

export type SaleOrderImportLoteAuditAction = "delete" | "restore";

@Entity("lotes_auditory")
export class SaleOrderImportLoteAuditEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "lote_id", type: "uuid" })
  loteId: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "timezone('America/Lima', CURRENT_TIMESTAMP)",
  })
  createdAt: Date;

  @Column({ name: "executed_by", type: "uuid" })
  executedBy: string;

  @Column({ name: "action_execution", type: "varchar", length: 20 })
  actionExecution: SaleOrderImportLoteAuditAction;

  @ManyToOne(() => SaleOrderImportLoteEntity, { nullable: false })
  @JoinColumn({ name: "lote_id" })
  lote?: SaleOrderImportLoteEntity;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "executed_by", referencedColumnName: "id" })
  executor?: User;
}
