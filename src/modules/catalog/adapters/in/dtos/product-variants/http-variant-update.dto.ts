import { Type } from "class-transformer";
import { IsOptional, IsString, IsNumber, Min, ValidateNested } from "class-validator";
import { ProductVariantAttributesDto } from "./product-variant-attributes.dto";

export class HttpUpdateProductVariantDto {
  @IsOptional()
  @IsString()
  barcode?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantAttributesDto)
  attributes?: ProductVariantAttributesDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
