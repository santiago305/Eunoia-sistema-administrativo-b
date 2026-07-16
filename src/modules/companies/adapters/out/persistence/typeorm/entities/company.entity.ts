import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "companies" })
export class CompanyEntity {
  @PrimaryGeneratedColumn("uuid", { name: "company_id" })
  id!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 11 })
  ruc!: string;

  @Column({ type: "varchar", length: 6, nullable: true })
  ubigeo!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  department!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  district!: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  urbanization!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  email!: string | null;

  @Column({ name: "cod_local", type: "varchar", length: 50, nullable: true })
  codLocal!: string | null;

  @Column({ name: "sol_user", type: "varchar", length: 100, nullable: true })
  solUser!: string | null;

  @Column({ name: "sol_pass", type: "varchar", length: 255, nullable: true })
  solPass!: string | null;

  @Column({ name: "logo_path", type: "varchar", length: 255, nullable: true })
  logoPath!: string | null;

  @Column({ name: "isotype_path", type: "varchar", length: 255, nullable: true })
  isotypePath!: string | null;

  @Column({ name: "cert_path", type: "varchar", length: 255, nullable: true })
  certPath!: string | null;

  @Column({ type: "boolean", default: true })
  production!: boolean;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;
}
