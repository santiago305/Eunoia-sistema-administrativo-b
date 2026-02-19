import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { ProductVariantAttributesDto } from "./product-variant-attributes.dto";

export class HttpCreateProductVariantDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  baseUnitId: string;

  @IsOptional()
  @IsString()
  barcode?: string;

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
  @IsBoolean()
  isActive?: boolean;
}
