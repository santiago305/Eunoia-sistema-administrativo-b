import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { HttpCreatePaymentDto } from "src/modules/payments/adapters/in/dtos/payment/http-payment-create.dto";
import { HttpCreateCreditQuotaDto } from "src/modules/payments/adapters/in/dtos/credit-quota/http-credit-quota-create.dto";
import { HttpUpdateItemDto } from "../purchase-order-item/http-update-item";

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpUpdateItemDto)
  items?: HttpUpdateItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpCreatePaymentDto)
  payments?: HttpCreatePaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpCreateCreditQuotaDto)
  quotas?: HttpCreateCreditQuotaDto[];
}
