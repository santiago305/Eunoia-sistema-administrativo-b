import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class HttpPaymentMethodUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  number?: string;
}
