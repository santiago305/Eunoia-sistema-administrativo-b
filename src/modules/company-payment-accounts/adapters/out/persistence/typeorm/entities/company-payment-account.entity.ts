import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccountType } from "src/modules/company-payment-accounts/domain/entity/company-payment-account";

@Entity("company_payment_accounts")
@Index("idx_company_payment_accounts_company", ["companyId"])
@Index("uq_company_payment_accounts_company_number", ["companyId", "accountNumber"], { unique: true })
export class CompanyPaymentAccountEntity {
  @PrimaryGeneratedColumn("uuid", { name: "company_payment_account_id" })
  id: string;

  @Column({ name: "company_id", type: "uuid" })
  companyId: string;

  @Column({ type: "varchar", length: 30 })
  type: CompanyPaymentAccountType;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ name: "bank_name", type: "varchar", length: 120, nullable: true })
  bankName?: string | null;

  @Column({ name: "account_number", type: "varchar", length: 120, nullable: true })
  accountNumber?: string | null;

  @Column({ name: "account_last_four", type: "varchar", length: 4, nullable: true })
  accountLastFour?: string | null;

  @Column({ name: "card_last_four", type: "varchar", length: 4, nullable: true })
  cardLastFour?: string | null;

  @Column({ name: "wallet_name", type: "varchar", length: 120, nullable: true })
  walletName?: string | null;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type" })
  currency: CurrencyType;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
