import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpSupplierMethodUpdateDto {
  @IsOptional()
  @IsUUID()
  methodId?: string;

  @IsOptional()
  @IsString()
  number?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresVoucher?: boolean;
}
