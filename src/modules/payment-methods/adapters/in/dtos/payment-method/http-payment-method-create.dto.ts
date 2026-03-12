import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class HttpPaymentMethodCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
