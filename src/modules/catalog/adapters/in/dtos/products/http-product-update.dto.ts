import { IsOptional, IsString } from "class-validator";

export class HttpUpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}