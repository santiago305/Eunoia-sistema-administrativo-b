import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

@Entity("lotes_imports")
export class SaleOrderImportLoteEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "lote", type: "int", unique: true })
  lote: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "timezone('America/Lima', CURRENT_TIMESTAMP)",
  })
  createdAt: Date;

  @Column({ name: "created_by", type: "uuid" })
  createdBy: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "created_by", referencedColumnName: "id" })
  creator?: User;
}
