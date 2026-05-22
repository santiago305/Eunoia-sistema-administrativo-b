import { IsBoolean, IsOptional, IsString } from "class-validator";

export class HttpTelephoneReplaceDto {
  @IsString()
  number: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

