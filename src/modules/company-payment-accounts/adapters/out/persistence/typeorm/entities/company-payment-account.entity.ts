import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import {
  CompanyPaymentAccountType,
  CompanyPaymentAccountUsage,
} from "src/modules/company-payment-accounts/domain/entity/company-payment-account";

@Entity("company_payment_accounts")
@Index("idx_company_payment_accounts_company", ["companyId"])
@Index("ux_company_payment_accounts_default_scope", ["companyId", "currency", "usage"], {
  unique: true,
  where: "is_default = true AND is_active = true",
})
@Index("ux_company_payment_accounts_sensitive_hash", ["companyId", "sensitiveIdentifierHash"], {
  unique: true,
  where: "sensitive_identifier_hash IS NOT NULL",
})
export class CompanyPaymentAccountEntity {
  @PrimaryGeneratedColumn("uuid", { name: "company_payment_account_id" })
  id: string;

  @Column({ name: "company_id", type: "uuid" })
  companyId: string;

  @Column({ type: "varchar", length: 30 })
  type: CompanyPaymentAccountType;

  @Column({ type: "varchar", length: 20, default: "BOTH" })
  usage: CompanyPaymentAccountUsage;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ name: "bank_name", type: "varchar", length: 120, nullable: true })
  bankName?: string | null;

  @Column({ name: "institution_name", type: "varchar", length: 120, nullable: true })
  institutionName?: string | null;

  @Column({ name: "account_number", type: "varchar", length: 120, nullable: true })
  accountNumber?: string | null;

  @Column({ name: "account_last_four", type: "varchar", length: 4, nullable: true })
  accountLastFour?: string | null;

  @Column({ name: "cci_last_four", type: "varchar", length: 4, nullable: true })
  cciLastFour?: string | null;

  @Column({ name: "card_last_four", type: "varchar", length: 4, nullable: true })
  cardLastFour?: string | null;

  @Column({ name: "wallet_name", type: "varchar", length: 120, nullable: true })
  walletName?: string | null;

  @Column({ name: "wallet_provider", type: "varchar", length: 120, nullable: true })
  walletProvider?: string | null;

  @Column({ name: "wallet_phone_last_four", type: "varchar", length: 4, nullable: true })
  walletPhoneLastFour?: string | null;

  @Column({ name: "holder_name", type: "varchar", length: 150, nullable: true })
  holderName?: string | null;

  @Column({ name: "sensitive_identifier_encrypted", type: "text", nullable: true, select: false })
  sensitiveIdentifierEncrypted?: string | null;

  @Column({ name: "sensitive_identifier_hash", type: "varchar", length: 64, nullable: true, select: false })
  sensitiveIdentifierHash?: string | null;

  @Column({ name: "masked_label", type: "varchar", length: 220, nullable: true })
  maskedLabel?: string | null;

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
