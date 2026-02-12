import { IsOptional, IsString, IsNumber, Min, IsObject } from "class-validator";
import { ProductVariantAttributes } from "src/modules/catalag/application/dto/product-variants/input/attributes-product-variant";

export class HttpUpdateProductVariantDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsObject()
  attributes?: ProductVariantAttributes;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}