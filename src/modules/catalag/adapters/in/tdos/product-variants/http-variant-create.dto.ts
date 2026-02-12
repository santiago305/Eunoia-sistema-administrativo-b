import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";
import { ProductVariantAttributes } from "src/modules/catalag/application/dto/product-variants/input/attributes-product-variant";

export class HttpCreateProductVariantDto {
  @IsString()
  productId: string;

  @IsString()
  barcode: string;

  @IsObject()
  @IsOptional()
  attributes: ProductVariantAttributes;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}