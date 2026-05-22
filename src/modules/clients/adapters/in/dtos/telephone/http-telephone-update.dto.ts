import { IsBoolean, IsOptional, IsString } from "class-validator";

export class HttpUpdateTelephoneDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

