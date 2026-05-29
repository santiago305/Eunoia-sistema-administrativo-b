import { IsOptional, IsString } from "class-validator";

export class HttpBankAccountUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  number?: string | null;
}

