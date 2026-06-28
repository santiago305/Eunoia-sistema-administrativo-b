import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class HttpPaymentMethodUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  requiresVoucher?: boolean;
}
