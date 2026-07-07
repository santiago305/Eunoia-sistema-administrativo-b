import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class AddSaleOrderPaymentDto {
  @IsUUID()
  bankAccountId: string;

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
  note?: string;

  @IsOptional()
  @IsString()
  paymentPhoto?: string | null;
}

