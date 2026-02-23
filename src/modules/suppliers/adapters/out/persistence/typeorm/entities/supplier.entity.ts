// src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

@Entity("suppliers")
export class SupplierEntity {
  @PrimaryGeneratedColumn("uuid", { name: "supplier_id" })
  id: string;

  @Column({ name: "document_type", type: "enum", enum: SupplierDocType, enumName: "supplier_doc_type" })
  documentType: SupplierDocType;

  @Column({ name: "document_number", type: "varchar", length: 30 })
  documentNumber: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  name?: string | null;

  @Column({ name: "last_name", type: "varchar", length: 160, nullable: true })
  lastName?: string | null;

  @Column({ name: "trade_name", type: "varchar", length: 200, nullable: true })
  tradeName?: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  email?: string | null;

  @Column({ type: "text", nullable: true })
  address?: string | null;

  @Column({ type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "lead_time_days", type: "int", nullable: true })
  leadTimeDays?: number | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
