import { IsDateString, IsInt, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

export class HttpCreateCreditQuotaDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsDateString()
  expirationDate: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsNumber()
  @Min(0.01)
  totalToPay: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPaid?: number;
  
  @IsOptional()
  @IsUUID()
  poId?: string;
}
