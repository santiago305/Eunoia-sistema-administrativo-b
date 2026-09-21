import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class HttpCompanyMethodCreateDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsUUID()
  @IsNotEmpty()
  methodId: string;

  @IsOptional()
  @IsBoolean()
  requiresVoucher?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
