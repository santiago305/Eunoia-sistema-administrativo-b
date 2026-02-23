import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class HttpUpdateSupplierVariantDto {
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
