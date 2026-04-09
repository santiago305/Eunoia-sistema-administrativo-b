import { Type } from "class-transformer";
import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID, ValidateNested, IsNumber, Min, IsInt } from "class-validator";
import { ProductType } from "src/modules/catalog/domain/value-object/productType";
import { ProductVariantAttributesDto } from "../product-variants/product-variant-attributes.dto";

export class HttpCreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  baseUnitId: string;

  @IsOptional()
  @IsString()
  customSku?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantAttributesDto)
  attributes?: ProductVariantAttributesDto;

  @IsOptional()
  @IsString()
  barcode?: string;

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

  @IsEnum(ProductType)
  type: ProductType;
}
