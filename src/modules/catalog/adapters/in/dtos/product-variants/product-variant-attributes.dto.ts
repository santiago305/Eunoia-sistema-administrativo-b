import { IsOptional, IsString } from "class-validator";

export class ProductVariantAttributesDto {
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsString()
  presentation?: string;

  [key: string]: unknown;
}
