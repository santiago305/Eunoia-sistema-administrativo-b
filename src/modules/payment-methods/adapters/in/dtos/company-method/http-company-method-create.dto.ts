import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpCompanyMethodCreateDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsUUID()
  @IsNotEmpty()
  methodId: string;

  @IsOptional()
  @IsString()
  number?: string;
}
