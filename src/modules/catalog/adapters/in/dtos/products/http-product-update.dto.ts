import { Type } from "class-transformer";
import { IsOptional, IsString, IsEnum, IsUUID, IsNumber, Min, ValidateNested } from "class-validator";
import { ProductType } from "src/modules/catalog/domain/value-object/productType";
import { ProductVariantAttributesDto } from "../product-variants/product-variant-attributes.dto";

export class HttpUpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  baseUnitId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantAttributesDto)
  attributes?: ProductVariantAttributesDto;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
