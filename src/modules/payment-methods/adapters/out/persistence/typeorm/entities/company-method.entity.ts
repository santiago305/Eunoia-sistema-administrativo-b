import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CompanyEntity } from "src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity";
import { PaymentMethodEntity } from "./payment-method.entity";

@Entity("company_methods")
export class CompanyMethodEntity {
  @PrimaryGeneratedColumn("uuid", { name: "company_method_id" })
  id: string;

  @Column({ name: "company_id", type: "uuid" })
  companyId: string;

  @Column({ name: "method_id", type: "uuid" })
  methodId: string;

  @Column({ name: "requires_voucher", type: "boolean", default: true })
  requiresVoucher: boolean;

  @Column({ type: "boolean", default: true })
  enabled: boolean;

  @Column({ name: "evidence_policy", type: "varchar", length: 20, default: "INHERIT" })
  evidencePolicy: "INHERIT" | "REQUIRED" | "OPTIONAL";

  @ManyToOne(() => CompanyEntity)
  @JoinColumn({ name: "company_id" })
  company: CompanyEntity;

  @ManyToOne(() => PaymentMethodEntity)
  @JoinColumn({ name: "method_id" })
  method: PaymentMethodEntity;
}
