import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { SupplierPaymentDestinationType } from "../../../../../domain/entity/supplier-payment-destination";

@Entity("supplier_payment_destinations")
@Index("ux_supplier_payment_destinations_default_scope", ["supplierId", "currency", "type"], { unique: true, where: "is_default = true AND is_active = true AND requires_manual_review = false" })
@Index("ux_supplier_payment_destinations_sensitive_hash", ["supplierId", "methodId", "sensitiveIdentifierHash"], { unique: true, where: "sensitive_identifier_hash IS NOT NULL" })
export class SupplierPaymentDestinationEntity {
  @PrimaryGeneratedColumn("uuid", { name: "supplier_payment_destination_id" }) id: string;
  @Column({ name: "supplier_id", type: "uuid" }) supplierId: string;
  @Column({ name: "method_id", type: "uuid" }) methodId: string;
  @Column({ type: "varchar", length: 30 }) type: SupplierPaymentDestinationType;
  @Column({ type: "enum", enum: CurrencyType, enumName: "currency_type" }) currency: CurrencyType;
  @Column({ type: "varchar", length: 160 }) name: string;
  @Column({ name: "institution_name", type: "varchar", length: 120, nullable: true }) institutionName?: string | null;
  @Column({ name: "provider_name", type: "varchar", length: 120, nullable: true }) providerName?: string | null;
  @Column({ name: "account_number", type: "varchar", length: 120, nullable: true }) accountNumber?: string | null;
  @Column({ name: "account_last_four", type: "varchar", length: 4, nullable: true }) accountLastFour?: string | null;
  @Column({ name: "cci_last_four", type: "varchar", length: 4, nullable: true }) cciLastFour?: string | null;
  @Column({ name: "wallet_identifier_last_four", type: "varchar", length: 4, nullable: true }) walletIdentifierLastFour?: string | null;
  @Column({ name: "holder_name", type: "varchar", length: 160, nullable: true }) holderName?: string | null;
  @Column({ name: "sensitive_identifier_encrypted", type: "text", nullable: true, select: false }) sensitiveIdentifierEncrypted?: string | null;
  @Column({ name: "sensitive_identifier_hash", type: "varchar", length: 64, nullable: true, select: false }) sensitiveIdentifierHash?: string | null;
  @Column({ name: "masked_label", type: "varchar", length: 220, nullable: true }) maskedLabel?: string | null;
  @Column({ name: "is_active", type: "boolean", default: true }) isActive: boolean;
  @Column({ name: "is_default", type: "boolean", default: false }) isDefault: boolean;
  @Column({ name: "requires_manual_review", type: "boolean", default: false }) requiresManualReview: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt: Date;
}
