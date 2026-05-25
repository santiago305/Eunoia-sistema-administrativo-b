import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class HttpCreateSourceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

