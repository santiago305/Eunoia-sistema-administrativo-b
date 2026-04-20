import { Type } from "class-transformer";
import { IsArray, IsObject, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

class HttpPurchaseSearchFiltersDto {
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  supplierIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsArray()
  statuses?: PurchaseOrderStatus[];

  @IsOptional()
  @IsArray()
  documentTypes?: VoucherDocType[];

  @IsOptional()
  @IsArray()
  paymentForms?: PaymentFormType[];
}

class HttpPurchaseSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpPurchaseSearchFiltersDto)
  filters: HttpPurchaseSearchFiltersDto;
}

export class HttpCreatePurchaseSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpPurchaseSearchSnapshotDto)
  snapshot: HttpPurchaseSearchSnapshotDto;
}
