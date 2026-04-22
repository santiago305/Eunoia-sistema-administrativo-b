import { Transform, Type } from "class-transformer";
import { IsArray, IsBooleanString, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const normalized = raw.map((v) => String(v).trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
};

export class ListProductCatalogInventoryDocumentsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

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
  @IsEnum(DocType)
  docType?: DocType;

  @IsOptional()
  @IsEnum(ProductCatalogProductType)
  productType?: ProductCatalogProductType;

  @IsOptional()
  @IsEnum(DocStatus)
  status?: DocStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  includeItems?: string;

  @IsOptional()
  @IsUUID("4")
  createdById?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  createdByIdsIn?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  createdByIdsNotIn?: string[];

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
