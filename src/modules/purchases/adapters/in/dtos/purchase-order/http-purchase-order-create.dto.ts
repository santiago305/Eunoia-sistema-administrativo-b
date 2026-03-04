import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { HttpAddPurchaseOrderItemDto } from "../purchase-order-item/http-purchase-order-item-add.dto";
import { HttpCreatePaymentDto } from "src/modules/payments/adapters/in/dtos/payment/http-payment-create.dto";
import { HttpCreateCreditQuotaDto } from "src/modules/payments/adapters/in/dtos/credit-quota/http-credit-quota-create.dto";

export class HttpCreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string;

  @IsUUID()
  warehouseId: string;

  @IsEnum(VoucherDocType)
  documentType: VoucherDocType;

  @IsString()
  serie: string;

  @Type(() => Number)
  @IsInt()
  correlative: number;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsEnum(PaymentFormType)
  paymentForm: PaymentFormType;

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

  @IsNumber()
  @Min(0)
  totalTaxed: number;

  @IsNumber()
  @Min(0)
  totalExempted: number;

  @IsNumber()
  @Min(0)
  totalIgv: number;

  @IsNumber()
  @Min(0)
  purchaseValue: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsDateString()
  dateIssue?: string;

  @IsOptional()
  @IsDateString()
  dateExpiration?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpAddPurchaseOrderItemDto)
  items: HttpAddPurchaseOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpCreatePaymentDto)
  payments: HttpCreatePaymentDto[];
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpCreateCreditQuotaDto)
  quotas: HttpCreateCreditQuotaDto[];


}
