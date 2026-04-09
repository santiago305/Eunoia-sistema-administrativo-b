import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested, IsInt } from "class-validator";
import { ProductVariantAttributesDto } from "./product-variant-attributes.dto";

export class HttpCreateProductVariantDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  customSku?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantAttributesDto)
  attributes?: ProductVariantAttributesDto;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
