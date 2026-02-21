import { Type } from "class-transformer";
import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID, ValidateNested, IsNumber, Min } from "class-validator";
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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
