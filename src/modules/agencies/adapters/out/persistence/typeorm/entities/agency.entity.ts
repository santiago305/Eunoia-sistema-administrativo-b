import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("agencies")
export class AgencyEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  reference?: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  address?: string | null;

  @Index("idx_agencies_department_id")
  @Column({ name: "department_id", type: "varchar", length: 2 })
  departmentId: string;

  @Index("idx_agencies_province_id")
  @Column({ name: "province_id", type: "varchar", length: 4 })
  provinceId: string;

  @Index("idx_agencies_district_id")
  @Column({ name: "district_id", type: "varchar", length: 6 })
  districtId: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

