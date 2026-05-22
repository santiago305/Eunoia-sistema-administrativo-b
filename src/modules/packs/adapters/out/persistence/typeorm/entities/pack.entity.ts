import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PackItemEntity } from "./pack-item.entity";

@Entity("packs")
export class PackEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  description: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => PackItemEntity, (item) => item.pack)
  items: PackItemEntity[];
}

