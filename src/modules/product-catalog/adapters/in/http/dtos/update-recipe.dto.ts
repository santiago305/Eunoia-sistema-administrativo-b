import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class UpdateProductCatalogRecipeItemDto {
  @IsUUID()
  materialSkuId: string;

  @IsNumber()
  quantity: number;

  @IsUUID()
  unitId: string;
}

export class UpdateProductCatalogRecipeDto {
  @IsOptional()
  @IsNumber()
  yieldQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductCatalogRecipeItemDto)
  items?: UpdateProductCatalogRecipeItemDto[];
}
