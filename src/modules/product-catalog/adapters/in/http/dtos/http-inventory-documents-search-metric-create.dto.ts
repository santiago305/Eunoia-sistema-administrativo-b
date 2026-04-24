import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchFields,
  InventoryDocumentsSearchOperator,
  InventoryDocumentsSearchOperators,
} from "src/modules/product-catalog/application/dtos/inventory-documents-search/inventory-documents-search-snapshot";

class HttpInventoryDocumentsSearchRuleDto {
  @IsEnum(InventoryDocumentsSearchFields)
  field: InventoryDocumentsSearchField;

  @IsEnum(InventoryDocumentsSearchOperators)
  operator: InventoryDocumentsSearchOperator;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

class HttpInventoryDocumentsSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpInventoryDocumentsSearchRuleDto)
  filters: HttpInventoryDocumentsSearchRuleDto[];
}

export class HttpCreateInventoryDocumentsSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEnum(DocType)
  docType: DocType;

  @IsOptional()
  @IsEnum(ProductCatalogProductType)
  productType?: ProductCatalogProductType;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpInventoryDocumentsSearchSnapshotDto)
  snapshot: HttpInventoryDocumentsSearchSnapshotDto;
}

