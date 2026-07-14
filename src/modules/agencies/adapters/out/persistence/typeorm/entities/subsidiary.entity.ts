import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AgencyEntity } from "./agency.entity";

@Entity("subsidiaries")
export class SubsidiaryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_subsidiaries_agency_id")
  @Column({ name: "agency_id", type: "uuid" })
  agencyId: string;

  @ManyToOne(() => AgencyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "agency_id" })
  agency?: AgencyEntity;

  @Column({ type: "varchar", length: 120 })
  alias: string;

  @Index("idx_subsidiaries_department_id")
  @Column({ name: "department_id", type: "varchar", length: 2 })
  departmentId: string;

  @Index("idx_subsidiaries_province_id")
  @Column({ name: "province_id", type: "varchar", length: 4 })
  provinceId: string;

  @Index("idx_subsidiaries_district_id")
  @Column({ name: "district_id", type: "varchar", length: 6 })
  districtId: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  address?: string | null;

  @Column({ name: "base_price", type: "numeric", precision: 12, scale: 2, default: 0 })
  basePrice: string;

  @Column({ type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "generates_payable", type: "boolean", default: false })
  generatesPayable: boolean;

  @Column({ name: "payable_supplier_id", type: "uuid", nullable: true })
  payableSupplierId?: string | null;

  @Column({ name: "payable_description", type: "varchar", length: 250, nullable: true })
  payableDescription?: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
