import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const normalized = raw.map((v) => String(v).trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
};

export class ListProductCatalogInventoryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  filters?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  warehouseIdsIn?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  warehouseIdsNotIn?: string[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsUUID()
  skuId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  skuIdsIn?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  skuIdsNotIn?: string[];

  @IsOptional()
  @IsEnum(ProductCatalogProductType)
  productType?: ProductCatalogProductType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

