import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { CompanyEntity } from "src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity";
import { PaymentMethodEntity } from "./payment-method.entity";

@Entity("company_methods")
export class CompanyMethodEntity {
  @PrimaryColumn({ name: "company_id", type: "uuid" })
  companyId: string;

  @PrimaryColumn({ name: "method_id", type: "uuid" })
  methodId: string;

  @ManyToOne(() => CompanyEntity)
  @JoinColumn({ name: "company_id" })
  company: CompanyEntity;

  @ManyToOne(() => PaymentMethodEntity)
  @JoinColumn({ name: "method_id" })
  method: PaymentMethodEntity;
}
