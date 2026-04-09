import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class ProductCatalogRecipeItemDto {
  @IsUUID()
  materialSkuId: string;

  @IsNumber()
  quantity: number;

  @IsUUID()
  unitId: string;
}

export class CreateProductCatalogRecipeDto {
  @IsNumber()
  yieldQuantity: number;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCatalogRecipeItemDto)
  items: ProductCatalogRecipeItemDto[];
}
