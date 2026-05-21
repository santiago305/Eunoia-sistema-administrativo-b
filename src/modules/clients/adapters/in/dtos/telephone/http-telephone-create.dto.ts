import { IsBoolean, IsOptional, IsString } from "class-validator";

export class HttpCreateTelephoneDto {
  @IsString()
  number: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

