import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { ProductVariantAttributes } from "src/modules/catalog/application/dto/product-variants/input/attributes-product-variant";

export class HttpCreateProductVariantDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsObject()
  @IsOptional()
  attributes?: ProductVariantAttributes;

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
