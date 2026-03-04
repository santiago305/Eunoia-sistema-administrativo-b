import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export class HttpUpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(VoucherDocType)
  documentType?: VoucherDocType;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  correlative?: number;

  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType;

  @IsOptional()
  @IsEnum(PaymentFormType)
  paymentForm?: PaymentFormType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numQuotas?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTaxed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalExempted?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalIgv?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsDateString()
  dateIssue?: string;

  @IsOptional()
  @IsDateString()
  dateExpiration?: string;
}
