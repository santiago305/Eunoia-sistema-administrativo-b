import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class HttpPaymentMethodCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresVoucher?: boolean;
}
