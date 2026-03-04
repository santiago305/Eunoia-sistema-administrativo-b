import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { PaymentType } from "src/modules/payments/domain/value-objects/payment-type";

@Entity("payment_documents")
export class PaymentDocumentEntity {
  @PrimaryGeneratedColumn("uuid", { name: "pay_doc_id" })
  id: string;

  @Column({ name: "method", type: "enum", enum: PaymentType, enumName: "payment_type" })
  method: PaymentType;

  @Column({ name: "date", type: "date" })
  date: Date;

  @Column({ name: "operation_number", type: "varchar", length: 60, nullable: true })
  operationNumber?: string | null;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type" })
  currency: CurrencyType;

  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "note", type: "varchar", length: 225, nullable: true })
  note?: string | null;

  @Column({ name: "from_document_type", type: "enum", enum: PayDocType, enumName: "pay_doc_type" })
  fromDocumentType: PayDocType;
}
