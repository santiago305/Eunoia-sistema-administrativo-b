import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, IsNumber } from "class-validator";

export class HttpCreateSupplierVariantDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsOptional()
  @IsString()
  supplierSku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lastCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;
}
