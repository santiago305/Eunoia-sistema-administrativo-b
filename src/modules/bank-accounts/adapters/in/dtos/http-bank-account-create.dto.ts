import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpBankAccountCreateDto {
  @IsUUID()
  companyId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  number?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

