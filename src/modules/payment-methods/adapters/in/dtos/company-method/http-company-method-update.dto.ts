import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class HttpCompanyMethodUpdateDto {
  @IsOptional()
  @IsUUID()
  methodId?: string;

  @IsOptional()
  @IsBoolean()
  requiresVoucher?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
