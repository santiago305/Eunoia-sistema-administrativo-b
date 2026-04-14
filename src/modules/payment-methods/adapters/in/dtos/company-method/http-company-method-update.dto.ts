import { IsOptional, IsString, IsUUID } from "class-validator";

export class HttpCompanyMethodUpdateDto {
  @IsOptional()
  @IsUUID()
  methodId?: string;

  @IsOptional()
  @IsString()
  number?: string | null;
}
