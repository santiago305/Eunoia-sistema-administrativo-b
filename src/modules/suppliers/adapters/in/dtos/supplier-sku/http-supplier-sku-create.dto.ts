import { IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class HttpCreateSupplierSkuDto {
  @IsUUID()
  supplierId: string;

  @IsUUID()
  skuId: string;

  @IsOptional()
  @IsString()
  supplierSku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lastCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTimeDays?: number;
}
