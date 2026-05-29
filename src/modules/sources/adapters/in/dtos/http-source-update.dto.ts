import { IsOptional, IsString, MaxLength } from "class-validator";

export class HttpUpdateSourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;
}

