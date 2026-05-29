import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("bank_accounts")
@Index("idx_bank_accounts_company_id", ["companyId"])
@Index("uq_bank_accounts_company_number", ["companyId", "number"], { unique: true })
export class BankAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "company_id", type: "uuid" })
  companyId: string;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  number?: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;
}

