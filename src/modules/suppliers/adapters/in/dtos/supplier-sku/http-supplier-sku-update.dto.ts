import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class HttpUpdateSupplierSkuDto {
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
