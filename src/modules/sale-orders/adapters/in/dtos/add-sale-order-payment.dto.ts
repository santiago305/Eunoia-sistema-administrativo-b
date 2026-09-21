import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class AddSaleOrderPaymentDto {
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsUUID()
  companyPaymentAccountId?: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  operationNumber?: string;

  @IsOptional()
  @IsString()
  operationCode?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  paymentPhoto?: string | null;
}

