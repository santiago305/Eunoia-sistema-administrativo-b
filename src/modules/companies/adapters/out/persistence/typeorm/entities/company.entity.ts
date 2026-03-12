import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("companies")
export class CompanyEntity {
  @PrimaryGeneratedColumn("uuid", { name: "company_id" })
  id: string;

  @Column({ type: "varchar", length: 50 })
  name: string;

  @Column({ type: "varchar", length: 30 })
  ruc: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  ubigeo?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  department?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  province?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  district?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  urbanization?: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  address?: string | null;

  @Column({ type: "varchar", length: 15, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  email?: string | null;

  @Column({ name: "cod_local", type: "varchar", length: 30, nullable: true })
  codLocal?: string | null;

  @Column({ name: "sol_user", type: "varchar", nullable: true })
  solUser?: string | null;

  @Column({ name: "sol_pass", type: "varchar", nullable: true })
  solPass?: string | null;

  @Column({ name: "logo_path", type: "varchar", length: 500, nullable: true })
  logoPath?: string | null;

  @Column({ name: "cert_path", type: "varchar", length: 500, nullable: true })
  certPath?: string | null;

  @Column({ type: "boolean", default: true })
  production: boolean;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
