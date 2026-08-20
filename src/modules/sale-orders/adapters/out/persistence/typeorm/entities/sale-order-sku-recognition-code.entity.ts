import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("sale_order_sku_recognition_codes")
@Index("ux_sale_order_sku_recognition_codes_code", ["code"], { unique: true })
export class SaleOrderSkuRecognitionCodeEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recognition_code_id" })
  id: string;

  @Column({ type: "varchar", length: 20 })
  code: string;

  @Column({ type: "varchar", length: 180, nullable: true })
  description: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string | null;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy: string | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
