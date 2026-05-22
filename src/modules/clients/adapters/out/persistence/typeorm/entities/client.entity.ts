import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";

@Index("ux_clients_document", ["docType", "docNumber"], { unique: true })
@Entity("clients")
export class ClientEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: ClientType, enumName: "client_type" })
  type: ClientType;

  @Column({ name: "full_name", type: "varchar", length: 255 })
  fullName: string;

  @Column({ name: "doc_type", type: "enum", enum: ClientDocType, enumName: "doc_type_client" })
  docType: ClientDocType;

  @Column({ name: "doc_number", type: "varchar", length: 60, nullable: true })
  docNumber?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  reference?: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  address?: string | null;

  @Index("idx_clients_department_id")
  @Column({ name: "department_id", type: "varchar", length: 2 })
  departmentId: string;

  @Index("idx_clients_province_id")
  @Column({ name: "province_id", type: "varchar", length: 4 })
  provinceId: string;

  @Index("idx_clients_district_id")
  @Column({ name: "district_id", type: "varchar", length: 6 })
  districtId: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
